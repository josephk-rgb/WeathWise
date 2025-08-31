import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

interface CircuitBreakerState {
  status: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: Date | null;
  successCount: number;
}

export class AIServiceManager {
  private circuitBreaker: CircuitBreakerState;
  private readonly maxFailures = 5;
  private readonly resetTimeoutMs = 60000; // 1 minute
  private readonly halfOpenRetries = 3;
  private readonly mlServiceUrl: string;
  private axiosInstance: AxiosInstance;

  constructor() {
    this.mlServiceUrl = process.env['PYTHON_ML_SERVICE_URL'] || process.env['ML_SERVICE_URL'] || 'http://localhost:8000';
    this.circuitBreaker = {
      status: 'CLOSED',
      failureCount: 0,
      lastFailureTime: null,
      successCount: 0
    };

    this.axiosInstance = axios.create({
      baseURL: this.mlServiceUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    logger.info(`AI Service Manager initialized with URL: ${this.mlServiceUrl}`);
  }

  /**
   * Check if the circuit breaker allows requests
   */
  private canMakeRequest(): boolean {
    const now = new Date();

    switch (this.circuitBreaker.status) {
      case 'CLOSED':
        return true;
      
      case 'OPEN':
        // Check if enough time has passed to try half-open
        if (this.circuitBreaker.lastFailureTime && 
            now.getTime() - this.circuitBreaker.lastFailureTime.getTime() > this.resetTimeoutMs) {
          this.circuitBreaker.status = 'HALF_OPEN';
          this.circuitBreaker.successCount = 0;
          logger.info('Circuit breaker moving to HALF_OPEN state');
          return true;
        }
        return false;
      
      case 'HALF_OPEN':
        return this.circuitBreaker.successCount < this.halfOpenRetries;
      
      default:
        return false;
    }
  }

  /**
   * Record a successful request
   */
  private recordSuccess(): void {
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.lastFailureTime = null;

    if (this.circuitBreaker.status === 'HALF_OPEN') {
      this.circuitBreaker.successCount++;
      
      if (this.circuitBreaker.successCount >= this.halfOpenRetries) {
        this.circuitBreaker.status = 'CLOSED';
        logger.info('Circuit breaker closed - service recovered');
      }
    }
  }

  /**
   * Record a failed request
   */
  private recordFailure(): void {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = new Date();

    if (this.circuitBreaker.failureCount >= this.maxFailures) {
      this.circuitBreaker.status = 'OPEN';
      logger.warn(`Circuit breaker opened - AI service failed ${this.maxFailures} times`);
    }
  }

  /**
   * Check if AI service is available
   */
  async isServiceAvailable(): Promise<boolean> {
    if (!this.canMakeRequest()) {
      return false;
    }

    try {
      await this.axiosInstance.get('/health', { timeout: 5000 });
      this.recordSuccess();
      return true;
    } catch (error) {
      this.recordFailure();
      return false;
    }
  }

  /**
   * Chat with AI service
   */
  async chat(message: string, context?: any, model?: string): Promise<any> {
    if (!this.canMakeRequest()) {
      throw new Error('AI service is currently unavailable (circuit breaker open)');
    }

    try {
      const response = await this.axiosInstance.post('/chat', {
        message,
        context,
        model: model || 'llama3.1:8b'
      });

      this.recordSuccess();
      return response.data;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Get AI recommendations
   */
  async getRecommendations(userId?: string, portfolioData?: any): Promise<any> {
    if (!this.canMakeRequest()) {
      throw new Error('AI service is currently unavailable (circuit breaker open)');
    }

    try {
      let prompt = "Based on general financial best practices, what are 3 key recommendations for improving financial health?";
      
      if (portfolioData) {
        prompt = `Based on this portfolio data: ${JSON.stringify(portfolioData)}, provide 3 personalized financial recommendations.`;
      }

      const response = await this.axiosInstance.post('/chat', {
        message: prompt,
        context: { 
          user_id: userId,
          type: 'recommendations',
          portfolio: portfolioData
        },
        model: 'llama3.1:8b'
      });

      this.recordSuccess();
      return response.data;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Analyze sentiment
   */
  async analyzeSentiment(message: string): Promise<any> {
    if (!this.canMakeRequest()) {
      throw new Error('AI service is currently unavailable (circuit breaker open)');
    }

    try {
      const response = await this.axiosInstance.post('/analyze-sentiment', {
        message,
        model: 'llama3.1:8b'
      });

      this.recordSuccess();
      return response.data;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Get portfolio insights
   */
  async getPortfolioInsights(portfolioData: any, userId?: string): Promise<any> {
    if (!this.canMakeRequest()) {
      throw new Error('AI service is currently unavailable (circuit breaker open)');
    }

    try {
      const response = await this.axiosInstance.post('/portfolio-analysis', {
        portfolio: portfolioData,
        user_id: userId
      });

      this.recordSuccess();
      return response.data;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Get risk assessment
   */
  async getRiskAssessment(portfolioData: any, userProfile?: any): Promise<any> {
    if (!this.canMakeRequest()) {
      throw new Error('AI service is currently unavailable (circuit breaker open)');
    }

    try {
      const response = await this.axiosInstance.post('/risk-assessment', {
        portfolio: portfolioData,
        user_profile: userProfile
      });

      this.recordSuccess();
      return response.data;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Get circuit breaker status
   */
  getStatus(): any {
    return {
      circuitBreaker: {
        ...this.circuitBreaker,
        canMakeRequest: this.canMakeRequest()
      },
      serviceUrl: this.mlServiceUrl,
      lastChecked: new Date().toISOString()
    };
  }

  /**
   * Reset circuit breaker (for testing/manual reset)
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker = {
      status: 'CLOSED',
      failureCount: 0,
      lastFailureTime: null,
      successCount: 0
    };
    logger.info('Circuit breaker manually reset');
  }

  /**
   * Generate contextual fallback responses
   */
  generateFallbackResponse(type: 'chat' | 'recommendations' | 'sentiment' | 'insights' | 'risk', context?: any): any {
    const timestamp = new Date().toISOString();
    
    switch (type) {
      case 'chat':
        return {
          response: this.getContextualChatFallback(context?.message),
          confidence: 0.5,
          source: 'fallback',
          timestamp
        };
      
      case 'recommendations':
        return {
          recommendations: this.getContextualRecommendations(context?.portfolio),
          confidence: 0.7,
          source: 'fallback',
          timestamp
        };
      
      case 'sentiment':
        return {
          sentiment: 'neutral',
          confidence: 0.5,
          score: 0.0,
          source: 'fallback',
          timestamp
        };
      
      case 'insights':
        return {
          insights: this.getPortfolioInsightsFallback(context?.portfolio),
          confidence: 0.6,
          source: 'fallback',
          timestamp
        };
      
      case 'risk':
        return {
          riskLevel: 'moderate',
          score: 5,
          factors: ['Diversification needed', 'Market volatility', 'Time horizon considerations'],
          recommendations: ['Consider diversifying portfolio', 'Review risk tolerance'],
          confidence: 0.6,
          source: 'fallback',
          timestamp
        };
      
      default:
        return {
          message: 'Service temporarily unavailable',
          source: 'fallback',
          timestamp
        };
    }
  }

  private getContextualChatFallback(message?: string): string {
    if (!message) {
      return "I apologize, but I'm having trouble processing your request right now. Please try again later.";
    }

    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('portfolio') || lowerMessage.includes('investment')) {
      return "I'd be happy to help with your portfolio questions. While my AI features are temporarily unavailable, I recommend reviewing your asset allocation and ensuring proper diversification across different sectors and asset classes.";
    }
    
    if (lowerMessage.includes('budget') || lowerMessage.includes('spending')) {
      return "For budgeting advice, I suggest following the 50/30/20 rule: 50% for needs, 30% for wants, and 20% for savings and debt repayment. Track your expenses to identify areas for improvement.";
    }
    
    if (lowerMessage.includes('goal') || lowerMessage.includes('plan')) {
      return "Setting financial goals is important! Consider using SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound) and break larger goals into smaller, manageable steps.";
    }
    
    return "I apologize, but my AI service is temporarily unavailable. Please try again later, or feel free to explore the other features of the application.";
  }

  private getContextualRecommendations(portfolio?: any): string[] {
    const baseRecommendations = [
      "Create an emergency fund covering 3-6 months of expenses",
      "Review and optimize your spending patterns monthly",
      "Consider long-term investment strategies for wealth building"
    ];

    if (portfolio && portfolio.totalValue) {
      if (portfolio.totalValue < 10000) {
        return [
          "Focus on building an emergency fund first",
          "Start with low-cost index funds for diversification",
          "Automate your savings to build investing habits"
        ];
      } else if (portfolio.totalValue > 100000) {
        return [
          "Consider tax-loss harvesting strategies",
          "Review your asset allocation for optimal diversification",
          "Evaluate rebalancing frequency for your portfolio"
        ];
      }
    }

    return baseRecommendations;
  }

  private getPortfolioInsightsFallback(portfolio?: any): string[] {
    if (!portfolio) {
      return [
        "Portfolio analysis is temporarily unavailable",
        "Consider reviewing your asset allocation manually",
        "Ensure you have adequate diversification"
      ];
    }

    const insights = [];
    
    if (portfolio.stocks && portfolio.bonds) {
      const stockPercentage = (portfolio.stocks / portfolio.totalValue) * 100;
      if (stockPercentage > 80) {
        insights.push("Your portfolio appears heavily weighted toward stocks - consider adding bonds for stability");
      } else if (stockPercentage < 40) {
        insights.push("Your portfolio seems conservative - consider increasing stock allocation for growth");
      } else {
        insights.push("Your stock/bond allocation appears balanced");
      }
    }

    if (insights.length === 0) {
      insights.push("Portfolio insights are temporarily limited - please try again later");
    }

    return insights;
  }
}
