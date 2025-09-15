import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
import httpx
import os

try:
    import yfinance as yf
except Exception:
    yf = None  # type: ignore

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score


def _fetch_history_backend_sync(symbol: str, days: int = 365, authorization: Optional[str] = None) -> pd.DataFrame:
    """Fetch historical daily closes from backend if available."""
    base = os.getenv("BACKEND_API_URL", "http://localhost:3001/api")
    end = datetime.utcnow().date()
    start = (end - timedelta(days=days))
    params = {"symbol": symbol, "start": start.isoformat(), "end": end.isoformat()}
    headers = {"Authorization": authorization} if authorization else {}
    try:
        with httpx.Client(timeout=10) as client:
            # Use enhanced-features route that serves DB price history
            resp = client.get(f"{base}/enhanced-features/market/history", params=params, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                rows = data.get("data") if isinstance(data, dict) else data
                if isinstance(rows, list) and rows:
                    df = pd.DataFrame(rows)
                    date_col = 'date' if 'date' in df.columns else 'Date'
                    close_col = 'close' if 'close' in df.columns else 'Close'
                    vol_col = 'volume' if 'volume' in df.columns else 'Volume'
                    if date_col in df.columns and close_col in df.columns:
                        cols = [date_col, close_col]
                        if vol_col in df.columns:
                            cols.append(vol_col)
                        df = df[cols].rename(columns={date_col: 'Date', close_col: 'Close', vol_col: 'Volume' if vol_col in df.columns else vol_col})
                        df['Date'] = pd.to_datetime(df['Date'])
                        df = df.set_index('Date').sort_index()
                        return df
    except Exception:
        pass
    return pd.DataFrame()


def _safe_download(symbol: str, period: str = '1y') -> pd.DataFrame:
    if yf is None or not symbol:
        return pd.DataFrame()
    try:
        t = yf.Ticker(symbol)
        data = t.history(period=period)
        if data is None or data.empty:
            return pd.DataFrame()
        return data
    except Exception:
        return pd.DataFrame()


def _calc_rsi(close: pd.Series, window: int = 14) -> pd.Series:
    delta = close.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=window).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))


def _calc_macd(close: pd.Series) -> Tuple[pd.Series, pd.Series]:
    ema12 = close.ewm(span=12).mean()
    ema26 = close.ewm(span=26).mean()
    macd = ema12 - ema26
    signal = macd.ewm(span=9).mean()
    return macd, signal


def _features_from_history(df: pd.DataFrame) -> pd.DataFrame:
    if df is None or df.empty:
        return pd.DataFrame()
    data = df.copy()
    close = data['Close']
    data['RSI'] = _calc_rsi(close)
    macd, sig = _calc_macd(close)
    data['MACD'] = macd
    data['MACD_Signal'] = sig
    data['Price_Change_1d'] = close.pct_change(1)
    data['Price_Change_5d'] = close.pct_change(5)
    data['Price_Change_20d'] = close.pct_change(20)
    data['Volatility'] = close.rolling(window=20).std()
    data['Volume_SMA'] = data['Volume'].rolling(window=20).mean()
    # Drop NaNs
    data = data.dropna()
    feats = data[['RSI', 'MACD', 'Price_Change_1d', 'Price_Change_5d', 'Price_Change_20d', 'Volatility']].copy()
    return feats.dropna()


def _labels_from_close(close: pd.Series, forward_days: int = 5) -> pd.Series:
    fwd = close.shift(-forward_days) / close - 1.0
    labels = pd.Series(index=close.index, dtype=str)
    pos, neg = 0.02, -0.02
    labels[fwd > pos] = 'positive'
    labels[fwd < neg] = 'negative'
    labels[(fwd >= neg) & (fwd <= pos)] = 'neutral'
    return labels


class MarketSentimentAnalyzer:
    """Lightweight technical-feature sentiment classifier.

    - Train on multiple symbols' features/labels
    - Predict per-symbol latest sentiment and confidence
    - Keeps scaler and model in-memory
    """

    def __init__(self) -> None:
        self.scaler = StandardScaler()
        self.model = RandomForestClassifier(n_estimators=150, random_state=42)
        self.is_trained = False
        self.last_metrics: Dict = {}

    def train_model(self, symbols: List[str], authorization: Optional[str] = None) -> Dict:
        X_parts: List[pd.DataFrame] = []
        y_parts: List[pd.Series] = []

        for sym in symbols:
            try:
                # DB/Backend first, then Yahoo fallback
                hist = _fetch_history_backend_sync(sym, days=365, authorization=authorization)
                if hist is None or hist.empty:
                    hist = _safe_download(sym, period='1y')
                if hist.empty:
                    continue
                feats = _features_from_history(hist)
                if feats.empty:
                    continue
                labels = _labels_from_close(hist['Close'])
                idx = feats.index.intersection(labels.index)
                feats = feats.loc[idx]
                labels = labels.loc[idx]
                if len(idx) < 30:
                    continue
                X_parts.append(feats)
                y_parts.append(labels)
            except Exception:
                continue

        if not X_parts:
            raise ValueError("No valid training data from provided symbols")

        X = pd.concat(X_parts, ignore_index=True)
        y = pd.concat(y_parts, ignore_index=True)

        # Clean NaNs
        mask = ~(X.isna().any(axis=1) | y.isna())
        X = X[mask]
        y = y[mask]

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

        X_train_s = self.scaler.fit_transform(X_train)
        X_test_s = self.scaler.transform(X_test)

        self.model.fit(X_train_s, y_train)
        self.is_trained = True

        y_pred = self.model.predict(X_test_s)
        acc = float(accuracy_score(y_test, y_pred))

        # Feature importance mapping
        feat_names = list(X.columns)
        importances = {feat_names[i]: float(imp) for i, imp in enumerate(getattr(self.model, 'feature_importances_', np.zeros(len(feat_names))))}

        self.last_metrics = {
            'accuracy': acc,
            'feature_importance': importances,
            'training_samples': int(len(X_train)),
            'test_samples': int(len(X_test)),
            'trained_at': datetime.utcnow().isoformat()
        }
        return self.last_metrics

    def predict_sentiment(self, symbol: str, authorization: Optional[str] = None) -> Dict:
        if not self.is_trained:
            raise ValueError("Model must be trained before predicting")
        # DB/Backend first, then Yahoo fallback
        hist = _fetch_history_backend_sync(symbol, days=240, authorization=authorization)
        if hist is None or hist.empty:
            hist = _safe_download(symbol, period='6mo')
        feats = _features_from_history(hist)
        if feats.empty:
            return {
                'symbol': symbol,
                'combined_sentiment': 'neutral',
                'confidence': 0.0,
                'timestamp': datetime.utcnow().isoformat()
            }
        latest = feats.tail(1).values
        latest_s = self.scaler.transform(latest)
        pred = self.model.predict(latest_s)[0]
        if hasattr(self.model, 'predict_proba'):
            proba = self.model.predict_proba(latest_s)[0]
            classes = list(self.model.classes_)
            proba_map = {classes[i]: float(proba[i]) for i in range(len(classes))}
            conf = float(np.max(proba))
        else:
            proba_map = {pred: 1.0}
            conf = 1.0

        return {
            'symbol': symbol.upper(),
            'technical_sentiment': pred,
            'technical_probabilities': proba_map,
            'news_sentiment': { 'sentiment_label': 'neutral', 'confidence': 0.0 },
            'combined_sentiment': pred,
            'confidence': float(conf),
            'timestamp': datetime.utcnow().isoformat(),
            'modelVersion': 'rf-tech-1'
        }


# Global singleton
analyzer = MarketSentimentAnalyzer()


