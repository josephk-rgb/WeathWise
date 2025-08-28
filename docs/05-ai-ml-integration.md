# Part 5: AI & Machine Learning Integration

## 5.1 Local AI Architecture with Ollama

### Ollama Setup and Model Management

```typescript
// server/src/services/aiService.ts
import axios from 'axios';
import { ChatMessage, AIResponse, FinancialContext } from '../types/ai';

export class OllamaService {
  private baseUrl: string;
  private defaultModel: string;
  private models: Map<string, ModelConfig>;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.defaultModel = process.env.OLLAMA_DEFAULT_MODEL || 'llama3.1:8b';
    this.models = new Map([
      ['financial-advisor', {
        name: 'wealthwise-advisor',
        temperature: 0.3,
        top_p: 0.9,
        max_tokens: 1000,
        specialization: 'financial_advice'
      }],
      ['market-analyst', {
        name: 'llama3.1:8b',
        temperature: 0.2,
        top_p: 0.8,
        max_tokens: 800,
        specialization: 'market_analysis'
      }],
      ['conversational', {
        name: 'phi3:mini',
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 500,
        specialization: 'general_chat'
      }]
    ]);
  }

  async generateResponse(
    prompt: string, 
    context: FinancialContext,
    modelType: 'financial-advisor' | 'market-analyst' | 'conversational' = 'financial-advisor'
  ): Promise<AIResponse> {
    const modelConfig = this.models.get(modelType)!;
    const enhancedPrompt = this.buildFinancialPrompt(prompt, context, modelConfig.specialization);

    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: modelConfig.name,
        prompt: enhancedPrompt,
        stream: false,
        options: {
          temperature: modelConfig.temperature,
          top_p: modelConfig.top_p,
          max_tokens: modelConfig.max_tokens,
          stop: ["Human:", "User:", "\n\n---"]
        }
      }, {
        timeout: 30000
      });

      return {
        content: response.data.response,
        model: modelConfig.name,
        confidence: this.calculateConfidence(response.data),
        context: context,
        timestamp: new Date(),
        metadata: {
          processingTime: response.data.total_duration || 0,
          promptTokens: response.data.prompt_eval_count || 0,
          responseTokens: response.data.eval_count || 0
        }
      };
    } catch (error) {
      console.error('Ollama API error:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  private buildFinancialPrompt(
    userQuestion: string, 
    context: FinancialContext,
    specialization: string
  ): string {
    const baseContext = this.formatFinancialContext(context);
    
    const specializationPrompts = {
      financial_advice: `You are a professional financial advisor with 20+ years of experience. 
      Provide specific, actionable advice based on modern portfolio theory and current market conditions.
      Always consider risk tolerance, investment timeline, and diversification principles.`,
      
      market_analysis: `You are a senior market analyst with expertise in technical and fundamental analysis.
      Provide data-driven insights about market trends, sector performance, and economic indicators.
      Support your analysis with specific metrics and historical context.`,
      
      general_chat: `You are a helpful financial assistant. Provide clear, friendly responses
      about personal finance topics. Keep explanations simple and accessible.`
    };

    return `
${specializationPrompts[specialization]}

FINANCIAL CONTEXT:
${baseContext}

CURRENT MARKET CONDITIONS:
- Market Volatility: ${context.marketConditions?.volatility || 'Moderate'}
- Economic Outlook: ${context.marketConditions?.outlook || 'Neutral'}
- Interest Rate Environment: ${context.marketConditions?.interestRates || 'Stable'}

COMPLIANCE NOTE: Provide educational information only. Not personalized investment advice.
Recommend consulting with qualified financial professionals for investment decisions.

USER QUESTION: ${userQuestion}

RESPONSE GUIDELINES:
- Provide specific, actionable insights
- Include relevant financial metrics when applicable
- Explain reasoning behind recommendations
- Consider user's risk profile and goals
- Maintain professional, helpful tone
- Limit response to 3-4 paragraphs maximum

RESPONSE:`;
  }

  private formatFinancialContext(context: FinancialContext): string {
    const sections = [];

    if (context.portfolioValue) {
      sections.push(`Portfolio Value: $${context.portfolioValue.toLocaleString()}`);
    }

    if (context.riskProfile) {
      sections.push(`Risk Profile: ${context.riskProfile}`);
    }

    if (context.goals && context.goals.length > 0) {
      sections.push(`Financial Goals: ${context.goals.map(g => g.title).join(', ')}`);
    }

    if (context.recentTransactions && context.recentTransactions.length > 0) {
      const totalSpending = context.recentTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      sections.push(`Recent Monthly Spending: $${totalSpending.toLocaleString()}`);
    }

    if (context.topHoldings && context.topHoldings.length > 0) {
      sections.push(`Top Holdings: ${context.topHoldings.map(h => h.symbol).join(', ')}`);
    }

    if (context.assetAllocation) {
      const allocation = Object.entries(context.assetAllocation)
        .map(([type, percent]) => `${type}: ${percent.toFixed(1)}%`)
        .join(', ');
      sections.push(`Asset Allocation: ${allocation}`);
    }

    return sections.join('\n- ');
  }

  private calculateConfidence(response: any): number {
    // Simple confidence calculation based on response characteristics
    let confidence = 0.7; // Base confidence

    // Adjust based on response length (longer responses might be more comprehensive)
    const responseLength = response.response?.length || 0;
    if (responseLength > 500) confidence += 0.1;
    if (responseLength > 1000) confidence += 0.1;

    // Adjust based on processing time (faster might indicate more certain response)
    const processingTime = response.total_duration || 0;
    if (processingTime < 2000) confidence += 0.05;

    return Math.min(confidence, 0.95); // Cap at 95%
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      return response.data.models.map((model: any) => model.name);
    } catch (error) {
      console.error('Error fetching available models:', error);
      return [];
    }
  }

  async pullModel(modelName: string): Promise<boolean> {
    try {
      await axios.post(`${this.baseUrl}/api/pull`, {
        name: modelName
      });
      return true;
    } catch (error) {
      console.error('Error pulling model:', error);
      return false;
    }
  }
}

interface ModelConfig {
  name: string;
  temperature: number;
  top_p: number;
  max_tokens: number;
  specialization: string;
}
```

### Financial Context Builder

```typescript
// server/src/services/contextBuilder.ts
import { UserDocument, InvestmentDocument, TransactionDocument, GoalDocument } from '../types/database';
import { FinancialContext } from '../types/ai';
import { MarketDataService } from './marketDataService';

export class FinancialContextBuilder {
  private marketData: MarketDataService;

  constructor() {
    this.marketData = new MarketDataService();
  }

  async buildContext(userId: string): Promise<FinancialContext> {
    try {
      const [
        user,
        investments,
        recentTransactions,
        goals,
        marketConditions
      ] = await Promise.all([
        this.getUserProfile(userId),
        this.getUserInvestments(userId),
        this.getRecentTransactions(userId),
        this.getUserGoals(userId),
        this.marketData.getCurrentConditions()
      ]);

      const portfolioMetrics = this.calculatePortfolioMetrics(investments);
      const spendingAnalysis = this.analyzeSpending(recentTransactions);

      return {
        userId,
        portfolioValue: portfolioMetrics.totalValue,
        riskProfile: user?.riskProfile?.level || 'moderate',
        goals: goals,
        recentTransactions: recentTransactions.slice(0, 10), // Last 10 transactions
        topHoldings: portfolioMetrics.topHoldings,
        assetAllocation: portfolioMetrics.assetAllocation,
        portfolioPerformance: portfolioMetrics.performance,
        spendingPatterns: spendingAnalysis,
        marketConditions: marketConditions,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error building financial context:', error);
      throw new Error('Failed to build financial context');
    }
  }

  private calculatePortfolioMetrics(investments: InvestmentDocument[]) {
    const totalValue = investments.reduce((sum, inv) => 
      sum + (inv.position.shares * inv.position.currentPrice), 0
    );

    const totalCost = investments.reduce((sum, inv) => 
      sum + inv.position.totalCost, 0
    );

    const totalGainLoss = totalValue - totalCost;
    const totalReturn = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    // Top holdings by value
    const topHoldings = investments
      .map(inv => ({
        symbol: inv.securityInfo.symbol,
        name: inv.securityInfo.name,
        value: inv.position.shares * inv.position.currentPrice,
        allocation: totalValue > 0 ? (inv.position.shares * inv.position.currentPrice / totalValue) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Asset allocation
    const assetAllocation = investments.reduce((acc, inv) => {
      const value = inv.position.shares * inv.position.currentPrice;
      const allocation = totalValue > 0 ? (value / totalValue) * 100 : 0;
      acc[inv.securityInfo.type] = (acc[inv.securityInfo.type] || 0) + allocation;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalValue,
      totalCost,
      totalGainLoss,
      totalReturn,
      topHoldings,
      assetAllocation,
      performance: {
        oneDay: this.calculatePeriodReturn(investments, 1),
        oneWeek: this.calculatePeriodReturn(investments, 7),
        oneMonth: this.calculatePeriodReturn(investments, 30),
        threeMonth: this.calculatePeriodReturn(investments, 90)
      }
    };
  }

  private analyzeSpending(transactions: TransactionDocument[]) {
    const expenses = transactions.filter(t => t.transactionInfo.type === 'expense');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentExpenses = expenses.filter(t => 
      new Date(t.transactionInfo.date) >= thirtyDaysAgo
    );

    const categorySpending = recentExpenses.reduce((acc, t) => {
      const category = t.transactionInfo.category;
      acc[category] = (acc[category] || 0) + Math.abs(t.transactionInfo.amount);
      return acc;
    }, {} as Record<string, number>);

    const totalSpending = Object.values(categorySpending).reduce((sum, amount) => sum + amount, 0);

    return {
      totalMonthlySpending: totalSpending,
      topCategories: Object.entries(categorySpending)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: totalSpending > 0 ? (amount / totalSpending) * 100 : 0
        })),
      averageTransactionSize: recentExpenses.length > 0 ? 
        totalSpending / recentExpenses.length : 0
    };
  }

  private calculatePeriodReturn(investments: InvestmentDocument[], days: number): number {
    // This would ideally use historical price data
    // For now, we'll use a simplified calculation
    return investments.reduce((sum, inv) => {
      const currentValue = inv.position.shares * inv.position.currentPrice;
      const cost = inv.position.totalCost;
      return sum + (cost > 0 ? ((currentValue - cost) / cost) * 100 : 0);
    }, 0) / investments.length;
  }

  // Helper methods to fetch data (implement based on your database service)
  private async getUserProfile(userId: string): Promise<UserDocument | null> {
    // Implementation depends on your database service
    return null;
  }

  private async getUserInvestments(userId: string): Promise<InvestmentDocument[]> {
    // Implementation depends on your database service
    return [];
  }

  private async getRecentTransactions(userId: string): Promise<TransactionDocument[]> {
    // Implementation depends on your database service
    return [];
  }

  private async getUserGoals(userId: string): Promise<GoalDocument[]> {
    // Implementation depends on your database service
    return [];
  }
}
```

## 5.2 Machine Learning Models for Investment Analysis

### Portfolio Optimization Engine

```python
# ml-services/portfolio_optimizer.py
import numpy as np
import pandas as pd
from scipy.optimize import minimize
from typing import Dict, List, Tuple, Optional
import yfinance as yf
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

class PortfolioOptimizer:
    def __init__(self):
        self.risk_free_rate = 0.03  # 3% risk-free rate
        
    def get_historical_data(self, symbols: List[str], period: str = '2y') -> pd.DataFrame:
        """Fetch historical price data for given symbols."""
        try:
            data = yf.download(symbols, period=period, progress=False)
            if len(symbols) == 1:
                return data['Adj Close'].to_frame(symbols[0])
            return data['Adj Close'].dropna()
        except Exception as e:
            print(f"Error fetching data: {e}")
            return pd.DataFrame()
    
    def calculate_returns(self, prices: pd.DataFrame) -> pd.DataFrame:
        """Calculate daily returns from price data."""
        return prices.pct_change().dropna()
    
    def calculate_portfolio_stats(self, weights: np.ndarray, returns: pd.DataFrame) -> Dict:
        """Calculate portfolio statistics given weights and returns."""
        portfolio_return = np.sum(returns.mean() * weights) * 252  # Annualized
        portfolio_std = np.sqrt(np.dot(weights.T, np.dot(returns.cov() * 252, weights)))
        sharpe_ratio = (portfolio_return - self.risk_free_rate) / portfolio_std
        
        return {
            'return': portfolio_return,
            'volatility': portfolio_std,
            'sharpe_ratio': sharpe_ratio
        }
    
    def optimize_portfolio(self, 
                          symbols: List[str], 
                          risk_tolerance: str = 'moderate',
                          target_return: Optional[float] = None) -> Dict:
        """
        Optimize portfolio allocation using Modern Portfolio Theory.
        
        Args:
            symbols: List of stock symbols
            risk_tolerance: 'conservative', 'moderate', or 'aggressive'
            target_return: Target annual return (optional)
        
        Returns:
            Dictionary with optimal weights and portfolio statistics
        """
        # Fetch historical data
        prices = self.get_historical_data(symbols)
        if prices.empty:
            raise ValueError("Could not fetch price data for given symbols")
        
        returns = self.calculate_returns(prices)
        
        # Set up optimization constraints
        num_assets = len(symbols)
        constraints = [{'type': 'eq', 'fun': lambda x: np.sum(x) - 1}]  # Weights sum to 1
        bounds = tuple((0, 1) for _ in range(num_assets))  # No short selling
        
        # Risk tolerance adjustments
        risk_multipliers = {
            'conservative': 0.5,
            'moderate': 1.0,
            'aggressive': 1.5
        }
        risk_multiplier = risk_multipliers.get(risk_tolerance, 1.0)
        
        if target_return:
            # Optimize for minimum risk given target return
            constraints.append({
                'type': 'eq',
                'fun': lambda x: np.sum(returns.mean() * x) * 252 - target_return
            })
            
            def objective(weights):
                return np.sqrt(np.dot(weights.T, np.dot(returns.cov() * 252, weights)))
        else:
            # Optimize for maximum Sharpe ratio
            def objective(weights):
                stats = self.calculate_portfolio_stats(weights, returns)
                return -stats['sharpe_ratio'] * risk_multiplier
        
        # Initial guess (equal weights)
        initial_guess = np.array([1/num_assets] * num_assets)
        
        # Optimize
        result = minimize(objective, initial_guess, method='SLSQP',
                         bounds=bounds, constraints=constraints)
        
        if not result.success:
            raise ValueError("Optimization failed")
        
        optimal_weights = result.x
        portfolio_stats = self.calculate_portfolio_stats(optimal_weights, returns)
        
        # Calculate individual asset statistics
        asset_stats = {}
        for i, symbol in enumerate(symbols):
            asset_returns = returns[symbol]
            asset_stats[symbol] = {
                'weight': optimal_weights[i],
                'expected_return': asset_returns.mean() * 252,
                'volatility': asset_returns.std() * np.sqrt(252),
                'beta': self.calculate_beta(asset_returns, returns.mean(axis=1))
            }
        
        return {
            'symbols': symbols,
            'weights': dict(zip(symbols, optimal_weights)),
            'portfolio_stats': portfolio_stats,
            'asset_stats': asset_stats,
            'rebalancing_required': self.check_rebalancing_needed(optimal_weights),
            'risk_metrics': self.calculate_risk_metrics(optimal_weights, returns)
        }
    
    def calculate_beta(self, asset_returns: pd.Series, market_returns: pd.Series) -> float:
        """Calculate beta of an asset relative to market."""
        covariance = np.cov(asset_returns, market_returns)[0][1]
        market_variance = np.var(market_returns)
        return covariance / market_variance if market_variance != 0 else 1.0
    
    def calculate_risk_metrics(self, weights: np.ndarray, returns: pd.DataFrame) -> Dict:
        """Calculate additional risk metrics."""
        portfolio_returns = (returns * weights).sum(axis=1)
        
        # Value at Risk (95% confidence)
        var_95 = np.percentile(portfolio_returns, 5) * np.sqrt(252)
        
        # Maximum Drawdown
        cumulative_returns = (1 + portfolio_returns).cumprod()
        rolling_max = cumulative_returns.expanding().max()
        drawdown = (cumulative_returns - rolling_max) / rolling_max
        max_drawdown = drawdown.min()
        
        return {
            'var_95': var_95,
            'max_drawdown': max_drawdown,
            'downside_deviation': self.calculate_downside_deviation(portfolio_returns)
        }
    
    def calculate_downside_deviation(self, returns: pd.Series, 
                                   target_return: float = 0.0) -> float:
        """Calculate downside deviation."""
        downside_returns = returns[returns < target_return]
        return np.sqrt(np.mean(downside_returns ** 2)) * np.sqrt(252)
    
    def check_rebalancing_needed(self, optimal_weights: np.ndarray,
                                current_weights: Optional[np.ndarray] = None,
                                threshold: float = 0.05) -> bool:
        """Check if portfolio rebalancing is needed."""
        if current_weights is None:
            return False
        
        weight_differences = np.abs(optimal_weights - current_weights)
        return np.any(weight_differences > threshold)
    
    def generate_efficient_frontier(self, symbols: List[str], 
                                  num_portfolios: int = 100) -> Dict:
        """Generate efficient frontier for visualization."""
        prices = self.get_historical_data(symbols)
        returns = self.calculate_returns(prices)
        
        num_assets = len(symbols)
        results = np.zeros((3, num_portfolios))  # return, volatility, sharpe
        weights_array = np.zeros((num_portfolios, num_assets))
        
        # Generate random weights
        np.random.seed(42)
        for i in range(num_portfolios):
            weights = np.random.random(num_assets)
            weights /= np.sum(weights)
            weights_array[i] = weights
            
            stats = self.calculate_portfolio_stats(weights, returns)
            results[0, i] = stats['return']
            results[1, i] = stats['volatility']
            results[2, i] = stats['sharpe_ratio']
        
        return {
            'returns': results[0],
            'volatilities': results[1],
            'sharpe_ratios': results[2],
            'weights': weights_array
        }

# FastAPI endpoint for portfolio optimization
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI()
optimizer = PortfolioOptimizer()

class OptimizationRequest(BaseModel):
    symbols: List[str]
    risk_tolerance: str = 'moderate'
    target_return: Optional[float] = None
    current_weights: Optional[List[float]] = None

@app.post("/optimize-portfolio")
async def optimize_portfolio(request: OptimizationRequest):
    try:
        result = optimizer.optimize_portfolio(
            symbols=request.symbols,
            risk_tolerance=request.risk_tolerance,
            target_return=request.target_return
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/efficient-frontier")
async def get_efficient_frontier(symbols: List[str]):
    try:
        result = optimizer.generate_efficient_frontier(symbols)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
```

### Market Sentiment Analysis

```python
# ml-services/sentiment_analyzer.py
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, accuracy_score
import yfinance as yf
from datetime import datetime, timedelta
import requests
from textblob import TextBlob
import tweepy
from typing import Dict, List, Tuple
import warnings
warnings.filterwarnings('ignore')

class MarketSentimentAnalyzer:
    def __init__(self):
        self.scaler = StandardScaler()
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.is_trained = False
        
    def get_technical_indicators(self, symbol: str, period: str = '1y') -> pd.DataFrame:
        """Calculate technical indicators for sentiment analysis."""
        ticker = yf.Ticker(symbol)
        data = ticker.history(period=period)
        
        if data.empty:
            return pd.DataFrame()
        
        # Calculate technical indicators
        data['SMA_20'] = data['Close'].rolling(window=20).mean()
        data['SMA_50'] = data['Close'].rolling(window=50).mean()
        data['RSI'] = self.calculate_rsi(data['Close'])
        data['MACD'], data['MACD_Signal'] = self.calculate_macd(data['Close'])
        data['BB_Upper'], data['BB_Lower'] = self.calculate_bollinger_bands(data['Close'])
        data['Volume_SMA'] = data['Volume'].rolling(window=20).mean()
        
        # Price momentum indicators
        data['Price_Change_1d'] = data['Close'].pct_change(1)
        data['Price_Change_5d'] = data['Close'].pct_change(5)
        data['Price_Change_20d'] = data['Close'].pct_change(20)
        
        # Volume indicators
        data['Volume_Ratio'] = data['Volume'] / data['Volume_SMA']
        
        # Volatility
        data['Volatility'] = data['Close'].rolling(window=20).std()
        
        return data.dropna()
    
    def calculate_rsi(self, prices: pd.Series, window: int = 14) -> pd.Series:
        """Calculate Relative Strength Index."""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=window).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs))
    
    def calculate_macd(self, prices: pd.Series) -> Tuple[pd.Series, pd.Series]:
        """Calculate MACD and Signal line."""
        ema12 = prices.ewm(span=12).mean()
        ema26 = prices.ewm(span=26).mean()
        macd = ema12 - ema26
        signal = macd.ewm(span=9).mean()
        return macd, signal
    
    def calculate_bollinger_bands(self, prices: pd.Series, window: int = 20) -> Tuple[pd.Series, pd.Series]:
        """Calculate Bollinger Bands."""
        sma = prices.rolling(window=window).mean()
        std = prices.rolling(window=window).std()
        upper = sma + (std * 2)
        lower = sma - (std * 2)
        return upper, lower
    
    def get_news_sentiment(self, symbol: str, days: int = 7) -> Dict:
        """Analyze news sentiment for a given symbol."""
        # This would integrate with news APIs like Alpha Vantage, NewsAPI, etc.
        # For demonstration, we'll use a simplified approach
        
        try:
            # Placeholder for news API integration
            # news_data = self.fetch_news(symbol, days)
            
            # Simulated sentiment scores
            sentiment_scores = np.random.normal(0, 0.3, 10)  # Random sentiment scores
            
            avg_sentiment = np.mean(sentiment_scores)
            sentiment_volatility = np.std(sentiment_scores)
            
            # Classify sentiment
            if avg_sentiment > 0.1:
                sentiment_label = 'positive'
            elif avg_sentiment < -0.1:
                sentiment_label = 'negative'
            else:
                sentiment_label = 'neutral'
            
            return {
                'average_sentiment': avg_sentiment,
                'sentiment_volatility': sentiment_volatility,
                'sentiment_label': sentiment_label,
                'confidence': min(abs(avg_sentiment) * 5, 1.0)  # Convert to 0-1 scale
            }
        except Exception as e:
            print(f"Error analyzing news sentiment: {e}")
            return {
                'average_sentiment': 0.0,
                'sentiment_volatility': 0.0,
                'sentiment_label': 'neutral',
                'confidence': 0.0
            }
    
    def prepare_features(self, symbol: str) -> pd.DataFrame:
        """Prepare features for sentiment classification."""
        technical_data = self.get_technical_indicators(symbol)
        
        if technical_data.empty:
            return pd.DataFrame()
        
        # Select relevant features
        features = [
            'RSI', 'MACD', 'Price_Change_1d', 'Price_Change_5d', 
            'Price_Change_20d', 'Volume_Ratio', 'Volatility'
        ]
        
        feature_data = technical_data[features].copy()
        
        # Add derived features
        feature_data['SMA_Crossover'] = (technical_data['Close'] > technical_data['SMA_20']).astype(int)
        feature_data['BB_Position'] = (technical_data['Close'] - technical_data['BB_Lower']) / (technical_data['BB_Upper'] - technical_data['BB_Lower'])
        feature_data['MACD_Signal_Cross'] = (technical_data['MACD'] > technical_data['MACD_Signal']).astype(int)
        
        return feature_data.dropna()
    
    def create_labels(self, prices: pd.Series, forward_days: int = 5) -> pd.Series:
        """Create sentiment labels based on future price movements."""
        future_returns = prices.shift(-forward_days) / prices - 1
        
        # Define sentiment thresholds
        positive_threshold = 0.02  # 2% gain
        negative_threshold = -0.02  # 2% loss
        
        labels = pd.Series(index=prices.index, dtype=str)
        labels[future_returns > positive_threshold] = 'positive'
        labels[future_returns < negative_threshold] = 'negative'
        labels[(future_returns >= negative_threshold) & (future_returns <= positive_threshold)] = 'neutral'
        
        return labels
    
    def train_model(self, symbols: List[str]) -> Dict:
        """Train the sentiment classification model."""
        all_features = []
        all_labels = []
        
        for symbol in symbols:
            try:
                # Get features and labels
                features = self.prepare_features(symbol)
                if features.empty:
                    continue
                
                # Get price data for labels
                ticker = yf.Ticker(symbol)
                price_data = ticker.history(period='1y')['Close']
                labels = self.create_labels(price_data)
                
                # Align features and labels
                common_index = features.index.intersection(labels.index)
                if len(common_index) < 50:  # Minimum data requirement
                    continue
                
                features_aligned = features.loc[common_index]
                labels_aligned = labels.loc[common_index]
                
                all_features.append(features_aligned)
                all_labels.append(labels_aligned)
                
            except Exception as e:
                print(f"Error processing {symbol}: {e}")
                continue
        
        if not all_features:
            raise ValueError("No valid training data found")
        
        # Combine all data
        X = pd.concat(all_features, ignore_index=True)
        y = pd.concat(all_labels, ignore_index=True)
        
        # Remove any remaining NaN values
        mask = ~(X.isna().any(axis=1) | y.isna())
        X = X[mask]
        y = y[mask]
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train model
        self.model.fit(X_train_scaled, y_train)
        self.is_trained = True
        
        # Evaluate model
        y_pred = self.model.predict(X_test_scaled)
        accuracy = accuracy_score(y_test, y_pred)
        
        # Feature importance
        feature_importance = dict(zip(X.columns, self.model.feature_importances_))
        
        return {
            'accuracy': accuracy,
            'classification_report': classification_report(y_test, y_pred, output_dict=True),
            'feature_importance': feature_importance,
            'training_samples': len(X_train),
            'test_samples': len(X_test)
        }
    
    def predict_sentiment(self, symbol: str) -> Dict:
        """Predict market sentiment for a given symbol."""
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
        
        try:
            features = self.prepare_features(symbol)
            if features.empty:
                raise ValueError(f"Could not prepare features for {symbol}")
            
            # Use the most recent data point
            latest_features = features.iloc[-1:].values
            features_scaled = self.scaler.transform(latest_features)
            
            # Predict sentiment
            sentiment_pred = self.model.predict(features_scaled)[0]
            sentiment_proba = self.model.predict_proba(features_scaled)[0]
            
            # Get class probabilities
            classes = self.model.classes_
            probabilities = dict(zip(classes, sentiment_proba))
            
            # Get news sentiment
            news_sentiment = self.get_news_sentiment(symbol)
            
            # Combine technical and news sentiment
            combined_confidence = max(sentiment_proba) * 0.7 + news_sentiment['confidence'] * 0.3
            
            return {
                'symbol': symbol,
                'technical_sentiment': sentiment_pred,
                'technical_probabilities': probabilities,
                'news_sentiment': news_sentiment,
                'combined_sentiment': sentiment_pred,  # Could be more sophisticated
                'confidence': combined_confidence,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"Error predicting sentiment for {symbol}: {e}")
            return {
                'symbol': symbol,
                'technical_sentiment': 'neutral',
                'technical_probabilities': {'neutral': 1.0},
                'news_sentiment': {'sentiment_label': 'neutral', 'confidence': 0.0},
                'combined_sentiment': 'neutral',
                'confidence': 0.0,
                'timestamp': datetime.now().isoformat()
            }

# FastAPI endpoints
@app.post("/train-sentiment-model")
async def train_sentiment_model(symbols: List[str]):
    try:
        analyzer = MarketSentimentAnalyzer()
        result = analyzer.train_model(symbols)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/sentiment/{symbol}")
async def get_sentiment(symbol: str):
    try:
        analyzer = MarketSentimentAnalyzer()
        # In production, you'd load a pre-trained model
        result = analyzer.predict_sentiment(symbol)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
```

## 5.3 Investment Recommendation Engine

### ML-Powered Recommendation System

```typescript
// server/src/services/recommendationEngine.ts
import { InvestmentDocument, UserDocument, PortfolioSnapshotDocument } from '../types/database';
import { FinancialContext } from '../types/ai';
import axios from 'axios';

interface RecommendationRequest {
  userId: string;
  context: FinancialContext;
  recommendationType: 'buy' | 'sell' | 'hold' | 'rebalance';
  maxRecommendations: number;
}

interface MLRecommendation {
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  confidence: number;
  targetAllocation: number;
  reasoning: string[];
  expectedReturn: number;
  riskScore: number;
  timeHorizon: 'short' | 'medium' | 'long';
}

export class InvestmentRecommendationEngine {
  private mlServiceUrl: string;
  private portfolioOptimizer: string;
  private sentimentAnalyzer: string;

  constructor() {
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    this.portfolioOptimizer = `${this.mlServiceUrl}/optimize-portfolio`;
    this.sentimentAnalyzer = `${this.mlServiceUrl}/sentiment`;
  }

  async generateRecommendations(request: RecommendationRequest): Promise<MLRecommendation[]> {
    try {
      const [
        portfolioOptimization,
        marketSentiment,
        riskAnalysis,
        macroeconomicFactors
      ] = await Promise.all([
        this.getPortfolioOptimization(request.context),
        this.getMarketSentiment(request.context.topHoldings?.map(h => h.symbol) || []),
        this.analyzeRiskFactors(request.context),
        this.getMacroeconomicFactors()
      ]);

      const recommendations = this.synthesizeRecommendations({
        ...request,
        portfolioOptimization,
        marketSentiment,
        riskAnalysis,
        macroeconomicFactors
      });

      return recommendations.slice(0, request.maxRecommendations);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw new Error('Failed to generate investment recommendations');
    }
  }

  private async getPortfolioOptimization(context: FinancialContext): Promise<any> {
    if (!context.topHoldings || context.topHoldings.length === 0) {
      return null;
    }

    const symbols = context.topHoldings.map(h => h.symbol);
    const riskTolerance = context.riskProfile || 'moderate';

    try {
      const response = await axios.post(this.portfolioOptimizer, {
        symbols,
        risk_tolerance: riskTolerance,
        current_weights: context.topHoldings.map(h => h.allocation / 100)
      });

      return response.data;
    } catch (error) {
      console.error('Portfolio optimization error:', error);
      return null;
    }
  }

  private async getMarketSentiment(symbols: string[]): Promise<Record<string, any>> {
    const sentimentPromises = symbols.map(async (symbol) => {
      try {
        const response = await axios.get(`${this.sentimentAnalyzer}/${symbol}`);
        return { [symbol]: response.data };
      } catch (error) {
        console.error(`Sentiment analysis error for ${symbol}:`, error);
        return { [symbol]: { sentiment: 'neutral', confidence: 0 } };
      }
    });

    const sentimentResults = await Promise.all(sentimentPromises);
    return sentimentResults.reduce((acc, result) => ({ ...acc, ...result }), {});
  }

  private async analyzeRiskFactors(context: FinancialContext): Promise<any> {
    // Analyze portfolio risk factors
    const diversificationScore = this.calculateDiversificationScore(context);
    const concentrationRisk = this.calculateConcentrationRisk(context);
    const volatilityRisk = this.calculateVolatilityRisk(context);

    return {
      diversificationScore,
      concentrationRisk,
      volatilityRisk,
      overallRiskScore: (diversificationScore + concentrationRisk + volatilityRisk) / 3
    };
  }

  private async getMacroeconomicFactors(): Promise<any> {
    // This would integrate with economic data APIs
    // For now, we'll return mock data
    return {
      interestRates: 'rising',
      inflation: 'moderate',
      gdpGrowth: 'positive',
      marketVolatility: 'elevated',
      sectorRotation: 'technology_to_value'
    };
  }

  private synthesizeRecommendations(data: any): MLRecommendation[] {
    const recommendations: MLRecommendation[] = [];

    // Portfolio optimization recommendations
    if (data.portfolioOptimization) {
      const optimalWeights = data.portfolioOptimization.weights;
      const currentHoldings = data.context.topHoldings || [];

      for (const [symbol, optimalWeight] of Object.entries(optimalWeights)) {
        const currentHolding = currentHoldings.find(h => h.symbol === symbol);
        const currentWeight = currentHolding ? currentHolding.allocation / 100 : 0;
        const weightDifference = (optimalWeight as number) - currentWeight;

        if (Math.abs(weightDifference) > 0.05) { // 5% threshold
          const action = weightDifference > 0 ? 'buy' : 'sell';
          const sentiment = data.marketSentiment[symbol];

          recommendations.push({
            symbol,
            action,
            confidence: this.calculateConfidence(weightDifference, sentiment, data.riskAnalysis),
            targetAllocation: (optimalWeight as number) * 100,
            reasoning: this.generateReasoning(action, weightDifference, sentiment, data.macroeconomicFactors),
            expectedReturn: data.portfolioOptimization.asset_stats?.[symbol]?.expected_return || 0,
            riskScore: this.calculateRiskScore(symbol, data),
            timeHorizon: this.determineTimeHorizon(data.context.riskProfile, weightDifference)
          });
        }
      }
    }

    // Sentiment-based recommendations
    for (const [symbol, sentiment] of Object.entries(data.marketSentiment)) {
      if (sentiment.confidence > 0.7) {
        const action = this.sentimentToAction(sentiment.combined_sentiment);
        if (action !== 'hold') {
          recommendations.push({
            symbol,
            action,
            confidence: sentiment.confidence,
            targetAllocation: this.calculateTargetAllocation(action, data.context),
            reasoning: [`Strong ${sentiment.combined_sentiment} market sentiment detected`],
            expectedReturn: this.estimateExpectedReturn(sentiment),
            riskScore: this.calculateRiskScore(symbol, data),
            timeHorizon: 'short'
          });
        }
      }
    }

    // Risk-based recommendations
    if (data.riskAnalysis.concentrationRisk > 0.3) {
      recommendations.push({
        symbol: 'DIVERSIFICATION',
        action: 'buy',
        confidence: 0.8,
        targetAllocation: 0,
        reasoning: [
          'High concentration risk detected',
          'Consider diversifying across more sectors and asset classes'
        ],
        expectedReturn: 0,
        riskScore: data.riskAnalysis.overallRiskScore,
        timeHorizon: 'medium'
      });
    }

    // Remove duplicates and sort by confidence
    const uniqueRecommendations = this.removeDuplicateRecommendations(recommendations);
    return uniqueRecommendations.sort((a, b) => b.confidence - a.confidence);
  }

  private calculateConfidence(
    weightDifference: number,
    sentiment: any,
    riskAnalysis: any
  ): number {
    let confidence = Math.min(Math.abs(weightDifference) * 10, 0.9); // Base on weight difference

    if (sentiment) {
      confidence = (confidence + sentiment.confidence) / 2; // Average with sentiment
    }

    if (riskAnalysis.overallRiskScore < 0.3) {
      confidence += 0.1; // Boost confidence for low-risk scenarios
    }

    return Math.min(confidence, 0.95);
  }

  private generateReasoning(
    action: string,
    weightDifference: number,
    sentiment: any,
    macroFactors: any
  ): string[] {
    const reasoning = [];

    if (action === 'buy') {
      reasoning.push(`Portfolio optimization suggests increasing allocation by ${(weightDifference * 100).toFixed(1)}%`);
    } else {
      reasoning.push(`Portfolio optimization suggests reducing allocation by ${(Math.abs(weightDifference) * 100).toFixed(1)}%`);
    }

    if (sentiment && sentiment.confidence > 0.6) {
      reasoning.push(`Market sentiment is ${sentiment.combined_sentiment} with ${(sentiment.confidence * 100).toFixed(0)}% confidence`);
    }

    if (macroFactors.interestRates === 'rising' && action === 'sell') {
      reasoning.push('Rising interest rates may negatively impact growth stocks');
    }

    return reasoning;
  }

  private calculateDiversificationScore(context: FinancialContext): number {
    if (!context.assetAllocation) return 0.5;

    const allocations = Object.values(context.assetAllocation);
    const numAssets = allocations.length;
    
    // Herfindahl-Hirschman Index for concentration
    const hhi = allocations.reduce((sum, allocation) => sum + Math.pow(allocation / 100, 2), 0);
    
    // Convert to diversification score (1 - HHI, normalized)
    return Math.max(0, Math.min(1, (1 - hhi) * numAssets / 4));
  }

  private calculateConcentrationRisk(context: FinancialContext): number {
    if (!context.topHoldings || context.topHoldings.length === 0) return 1;

    const topHoldingAllocation = context.topHoldings[0]?.allocation || 0;
    return Math.min(1, topHoldingAllocation / 30); // Risk increases if top holding > 30%
  }

  private calculateVolatilityRisk(context: FinancialContext): number {
    // This would use historical volatility data
    // For now, return a moderate risk score
    return 0.5;
  }

  private sentimentToAction(sentiment: string): 'buy' | 'sell' | 'hold' {
    switch (sentiment) {
      case 'positive': return 'buy';
      case 'negative': return 'sell';
      default: return 'hold';
    }
  }

  private calculateTargetAllocation(action: string, context: FinancialContext): number {
    const baseAllocation = 5; // 5% base allocation
    
    if (action === 'buy') {
      return Math.min(15, baseAllocation * (context.riskProfile === 'aggressive' ? 2 : 1));
    } else {
      return Math.max(0, baseAllocation * 0.5);
    }
  }

  private estimateExpectedReturn(sentiment: any): number {
    const baseReturn = 0.08; // 8% base expected return
    const sentimentMultiplier = sentiment.confidence * 
      (sentiment.combined_sentiment === 'positive' ? 1.2 : 
       sentiment.combined_sentiment === 'negative' ? 0.8 : 1.0);
    
    return baseReturn * sentimentMultiplier;
  }

  private calculateRiskScore(symbol: string, data: any): number {
    // Combine various risk factors
    let riskScore = 0.5; // Base risk

    if (data.marketSentiment[symbol]) {
      const sentiment = data.marketSentiment[symbol];
      if (sentiment.combined_sentiment === 'negative') {
        riskScore += 0.2;
      } else if (sentiment.combined_sentiment === 'positive') {
        riskScore -= 0.1;
      }
    }

    return Math.max(0, Math.min(1, riskScore));
  }

  private determineTimeHorizon(
    riskProfile: string, 
    weightDifference: number
  ): 'short' | 'medium' | 'long' {
    if (Math.abs(weightDifference) > 0.15) return 'short'; // Large changes need immediate action
    if (riskProfile === 'aggressive') return 'short';
    if (riskProfile === 'conservative') return 'long';
    return 'medium';
  }

  private removeDuplicateRecommendations(recommendations: MLRecommendation[]): MLRecommendation[] {
    const seen = new Set();
    return recommendations.filter(rec => {
      const key = `${rec.symbol}-${rec.action}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
```

## Next Steps

Part 6 will cover Backend API Development:
- RESTful API design and implementation
- GraphQL integration for flexible data queries
- WebSocket implementation for real-time updates
- API security and rate limiting
- Data validation and error handling
- Performance optimization and caching strategies
