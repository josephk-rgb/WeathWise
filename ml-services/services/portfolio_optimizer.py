import numpy as np
import pandas as pd
from scipy.optimize import minimize
from typing import Dict, List, Tuple, Optional
from datetime import datetime

try:
    import yfinance as yf
except Exception:  # pragma: no cover
    yf = None  # type: ignore


class PortfolioOptimizer:
    """Modern Portfolio Theory based optimizer with simple defaults.

    - Fetches daily adjusted close prices via yfinance
    - Computes annualized return/volatility and Sharpe ratio
    - Optimizes for max Sharpe (or min risk for a target return)
    - Generates optional efficient frontier samples
    """

    def __init__(self, risk_free_rate: float = 0.03):
        self.risk_free_rate = risk_free_rate

    def get_historical_data(self, symbols: List[str], period: str = "2y") -> pd.DataFrame:
        if yf is None or not symbols:
            return pd.DataFrame()
        # Try multiple periods with a simple retry to improve robustness
        periods = [period, "1y", "6mo"]
        for p in periods:
            try:
                data = yf.download(symbols, period=p, progress=False)
                if data is None or len(data) == 0:
                    continue
                try:
                    adj = data.get("Adj Close", None)
                    if adj is None:
                        # Some versions return already the price frame at top-level
                        adj = data
                    if len(symbols) == 1:
                        df = adj.to_frame(symbols[0]) if isinstance(adj, pd.Series) else adj.to_frame(symbols[0])
                        df = df.dropna()
                    else:
                        df = adj.dropna()
                    if not df.empty:
                        return df
                except Exception:
                    continue
            except Exception:
                continue
        return pd.DataFrame()

    def calculate_returns(self, prices: pd.DataFrame) -> pd.DataFrame:
        return prices.pct_change().dropna()

    def calculate_portfolio_stats(self, weights: np.ndarray, returns: pd.DataFrame) -> Dict:
        annual_return = float(np.sum(returns.mean() * weights) * 252)
        annual_vol = float(np.sqrt(np.dot(weights.T, np.dot(returns.cov() * 252, weights))))
        sharpe = float((annual_return - self.risk_free_rate) / annual_vol) if annual_vol > 0 else 0.0
        return {"return": annual_return, "volatility": annual_vol, "sharpe_ratio": sharpe}

    def optimize(self, symbols: List[str], risk_tolerance: str = "moderate", target_return: Optional[float] = None) -> Dict:
        prices = self.get_historical_data(symbols)
        if prices.empty:
            raise ValueError("Price data unavailable for symbols")
        returns = self.calculate_returns(prices)

        num = len(symbols)
        bounds = tuple((0, 1) for _ in range(num))
        constraints = [{"type": "eq", "fun": lambda x: np.sum(x) - 1}]

        risk_mult = {"conservative": 0.5, "moderate": 1.0, "aggressive": 1.5}.get(risk_tolerance, 1.0)

        if target_return is not None:
            constraints.append({
                "type": "eq",
                "fun": lambda x: np.sum(returns.mean() * x) * 252 - target_return
            })
            def objective(w):
                return np.sqrt(np.dot(w.T, np.dot(returns.cov() * 252, w)))
        else:
            def objective(w):
                stats = self.calculate_portfolio_stats(w, returns)
                return -stats["sharpe_ratio"] * risk_mult

        initial = np.array([1/num] * num)
        result = minimize(objective, initial, method="SLSQP", bounds=bounds, constraints=constraints)
        if not result.success:
            raise ValueError("Optimization failed: " + str(result.message))

        opt_weights = result.x
        stats = self.calculate_portfolio_stats(opt_weights, returns)

        asset_stats: Dict[str, Dict[str, float]] = {}
        for i, sym in enumerate(symbols):
            r = returns[sym]
            asset_stats[sym] = {
                "weight": float(opt_weights[i]),
                "expected_return": float(r.mean() * 252),
                "volatility": float(r.std() * np.sqrt(252))
            }

        risk_metrics = self._risk_metrics(opt_weights, returns)

        return {
            "symbols": symbols,
            "weights": dict(zip(symbols, [float(x) for x in opt_weights])),
            "portfolio_stats": stats,
            "asset_stats": asset_stats,
            "risk_metrics": risk_metrics,
            "generated_at": datetime.utcnow().isoformat()
        }

    def efficient_frontier(self, symbols: List[str], num_portfolios: int = 100) -> Dict:
        prices = self.get_historical_data(symbols)
        if prices.empty:
            raise ValueError("Price data unavailable for symbols")
        returns = self.calculate_returns(prices)

        num = len(symbols)
        results = np.zeros((3, num_portfolios))
        weights_array = np.zeros((num_portfolios, num))
        np.random.seed(42)
        for i in range(num_portfolios):
            w = np.random.random(num)
            w /= np.sum(w)
            weights_array[i] = w
            stats = self.calculate_portfolio_stats(w, returns)
            results[0, i] = stats["return"]
            results[1, i] = stats["volatility"]
            results[2, i] = stats["sharpe_ratio"]

        return {
            "returns": results[0].tolist(),
            "volatilities": results[1].tolist(),
            "sharpe_ratios": results[2].tolist(),
            "weights": weights_array.tolist()
        }

    def _risk_metrics(self, weights: np.ndarray, returns: pd.DataFrame) -> Dict:
        portfolio_returns = (returns * weights).sum(axis=1)
        var_95 = float(np.percentile(portfolio_returns, 5) * np.sqrt(252))
        cumulative = (1 + portfolio_returns).cumprod()
        rolling_max = cumulative.expanding().max()
        drawdown = (cumulative - rolling_max) / rolling_max
        max_dd = float(drawdown.min())
        downside_dev = float(self._downside_deviation(portfolio_returns))
        return {"var_95": var_95, "max_drawdown": max_dd, "downside_deviation": downside_dev}

    def _downside_deviation(self, returns: pd.Series, target_return: float = 0.0) -> float:
        downside = returns[returns < target_return]
        if len(downside) == 0:
            return 0.0
        return float(np.sqrt(np.mean(np.square(downside))) * np.sqrt(252))


