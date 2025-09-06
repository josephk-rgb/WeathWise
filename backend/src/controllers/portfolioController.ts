import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Investment, IInvestment } from '../models';
import { logger } from '../utils/logger';
import { MarketAnalyticsService } from '../services/marketAnalyticsService';

export class PortfolioController {
  private static analyticsService = new MarketAnalyticsService();

  // Get portfolio overview
  static async getPortfolioOverview(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      logger.info('Portfolio overview request:', { userId, userObj: req.user });
      
      if (!userId) {
        logger.error('User not authenticated for portfolio overview');
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      logger.info('Fetching investments for user:', userId);
      const investments = await Investment.find({ userId, isActive: true });
      logger.info('Found investments:', { count: investments.length, userId });

      // Calculate portfolio metrics
      let totalValue = 0;
      let totalCost = 0;
      let totalGainLoss = 0;
      const assetAllocation: { [key: string]: number } = {};

      investments.forEach(investment => {
        const currentValue = investment.position.shares * investment.position.currentPrice;
        const costBasis = investment.position.totalCost;
        
        totalValue += currentValue;
        totalCost += costBasis;
        totalGainLoss += (currentValue - costBasis);

        // Asset allocation by type
        const type = investment.securityInfo.type;
        assetAllocation[type] = (assetAllocation[type] || 0) + currentValue;
      });

      const totalReturn = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

      // Convert asset allocation to percentages
      const assetAllocationPercent: { [key: string]: number } = {};
      Object.keys(assetAllocation).forEach(type => {
        assetAllocationPercent[type] = totalValue > 0 ? 
          (assetAllocation[type] / totalValue) * 100 : 0;
      });

      const portfolioData = {
        totalValue,
        totalCost,
        totalGainLoss,
        totalReturn,
        investmentCount: investments.length,
        assetAllocation: assetAllocationPercent,
        lastUpdated: new Date()
      };

      logger.info('Portfolio overview calculated:', portfolioData);

      // Set caching headers for polling optimization
      const lastModified = new Date().toUTCString();
      res.set({
        'Last-Modified': lastModified,
        'Cache-Control': 'public, max-age=30', // 30 seconds cache
        'ETag': `"portfolio-${userId}-${Date.now()}"`
      });

      // Check if client has current version
      const ifModifiedSince = req.headers['if-modified-since'];
      if (ifModifiedSince) {
        const clientDate = new Date(ifModifiedSince);
        const dataAge = Date.now() - portfolioData.lastUpdated.getTime();
        
        // If data is less than 30 seconds old, return 304
        if (dataAge < 30000) {
          res.status(304).end();
          return;
        }
      }

      res.json({
        success: true,
        data: portfolioData
      });
    } catch (error) {
      logger.error('Error getting portfolio overview:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get portfolio performance
  static async getPortfolioPerformance(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { period = '1y' } = req.query;
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '1w':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '1m':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case '3m':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case '6m':
          startDate.setMonth(endDate.getMonth() - 6);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        case 'all':
          startDate.setFullYear(2000); // Far back date
          break;
        default:
          startDate.setFullYear(endDate.getFullYear() - 1);
      }

      const investments = await Investment.find({ 
        userId, 
        isActive: true,
        'acquisition.purchaseDate': { $gte: startDate }
      });

      // Calculate performance metrics
      const performanceData = investments.map(investment => {
        const currentValue = investment.position.shares * investment.position.currentPrice;
        const costBasis = investment.position.totalCost;
        const gainLoss = currentValue - costBasis;
        const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

        return {
          symbol: investment.securityInfo.symbol,
          name: investment.securityInfo.name,
          type: investment.securityInfo.type,
          shares: investment.position.shares,
          currentPrice: investment.position.currentPrice,
          averageCost: investment.position.averageCost,
          currentValue,
          costBasis,
          gainLoss,
          gainLossPercent
        };
      });

      // Sort by performance
      performanceData.sort((a, b) => b.gainLossPercent - a.gainLossPercent);

      // Generate historical performance data (simplified)
      const historicalPerformance = [];
      const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const intervalDays = daysInPeriod > 180 ? 7 : daysInPeriod > 30 ? 1 : 1; // Weekly for >6mo, daily otherwise
      
      let currentValue = performanceData.reduce((sum, inv) => sum + inv.costBasis, 0);
      const totalCurrentValue = performanceData.reduce((sum, inv) => sum + inv.currentValue, 0);
      
      // Simple growth simulation based on actual performance
      const totalGrowthRate = currentValue > 0 ? (totalCurrentValue / currentValue - 1) : 0;
      const dailyGrowthRate = totalGrowthRate / daysInPeriod;

      for (let i = 0; i <= daysInPeriod; i += intervalDays) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        // Add some realistic volatility
        const volatility = (Math.random() - 0.5) * 0.02; // ±1% daily volatility
        const growth = dailyGrowthRate * i + volatility;
        currentValue = Math.max(0, currentValue * (1 + growth));
        
        historicalPerformance.push({
          date: date.toISOString().split('T')[0],
          value: Math.round(currentValue * 100) / 100
        });
      }

      res.json({
        success: true,
        data: {
          period,
          dateRange: { startDate, endDate },
          investments: performanceData,
          historicalPerformance,
          summary: {
            totalInvestments: performanceData.length,
            bestPerformer: performanceData[0] || null,
            worstPerformer: performanceData[performanceData.length - 1] || null,
            totalValue: totalCurrentValue,
            totalCost: performanceData.reduce((sum, inv) => sum + inv.costBasis, 0)
          }
        }
      });
    } catch (error) {
      logger.error('Error getting portfolio performance:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get portfolio metrics
  static async getPortfolioMetrics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const investments = await Investment.find({ userId, isActive: true });

      if (investments.length === 0) {
        res.json({
          success: true,
          data: {
            diversification: { score: 0, analysis: 'No investments found' },
            riskMetrics: { beta: 0, volatility: 0 },
            performanceMetrics: { totalReturn: 0, annualizedReturn: 0 }
          }
        });
        return;
      }

      // Calculate diversification score
      const typeDistribution: { [key: string]: number } = {};
      let totalValue = 0;

      investments.forEach(investment => {
        const currentValue = investment.position.shares * investment.position.currentPrice;
        totalValue += currentValue;
        
        const type = investment.securityInfo.type;
        typeDistribution[type] = (typeDistribution[type] || 0) + currentValue;
      });

      // Diversification score (0-100) based on number of asset types and distribution
      const assetTypes = Object.keys(typeDistribution).length;
      const maxTypes = 6; // stock, crypto, etf, bond, real_estate, other
      const typeScore = Math.min(assetTypes / maxTypes, 1) * 50;

      // Distribution score based on how evenly distributed the assets are
      const idealDistribution = 1 / assetTypes;
      const distributionVariance = Object.values(typeDistribution).reduce((sum, value) => {
        const actualDistribution = value / totalValue;
        return sum + Math.pow(actualDistribution - idealDistribution, 2);
      }, 0);
      const distributionScore = Math.max(0, 50 - (distributionVariance * 1000));

      const diversificationScore = Math.round(typeScore + distributionScore);

      // Calculate basic performance metrics
      let totalCost = 0;
      let totalCurrentValue = 0;
      let weightedAge = 0;

      investments.forEach(investment => {
        const currentValue = investment.position.shares * investment.position.currentPrice;
        const costBasis = investment.position.totalCost;
        const age = (Date.now() - investment.acquisition.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
        
        totalCurrentValue += currentValue;
        totalCost += costBasis;
        weightedAge += age * (currentValue / totalValue);
      });

      const totalReturn = totalCost > 0 ? ((totalCurrentValue - totalCost) / totalCost) * 100 : 0;
      const annualizedReturn = weightedAge > 0 ? 
        Math.pow(totalCurrentValue / totalCost, 1 / weightedAge) * 100 - 100 : 0;

      // Calculate real risk metrics using market analytics
      let riskMetrics = { beta: 1.0, volatility: 15.0 };
      
      try {
        // Prepare holdings data for portfolio analytics
        const holdings = investments.map(investment => ({
          symbol: investment.securityInfo.symbol,
          weight: (investment.position.shares * investment.position.currentPrice) / totalCurrentValue
        }));

        // Get real portfolio risk metrics
        const portfolioMetrics = await PortfolioController.analyticsService.calculatePortfolioMetrics(holdings);
        riskMetrics = {
          beta: portfolioMetrics.beta,
          volatility: portfolioMetrics.volatility
        };
      } catch (analyticsError) {
        logger.warn('Failed to calculate real risk metrics, using defaults:', analyticsError);
        // Keep default values on error
      }

      res.json({
        success: true,
        data: {
          diversification: {
            score: diversificationScore,
            assetTypes,
            distribution: Object.keys(typeDistribution).map(type => ({
              type,
              value: typeDistribution[type],
              percentage: (typeDistribution[type] / totalValue) * 100
            }))
          },
          riskMetrics,
          performanceMetrics: {
            totalReturn: Math.round(totalReturn * 100) / 100,
            annualizedReturn: Math.round(annualizedReturn * 100) / 100,
            averageAge: Math.round(weightedAge * 100) / 100
          }
        }
      });
    } catch (error) {
      logger.error('Error getting portfolio metrics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get portfolio insights
  static async getPortfolioInsights(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const investments = await Investment.find({ userId, isActive: true });

      const insights = [];

      if (investments.length === 0) {
        insights.push({
          type: 'suggestion',
          title: 'Start Your Investment Journey',
          description: 'Consider adding your first investment to begin building your portfolio.',
          priority: 'high'
        });
      } else {
        // Asset allocation analysis
        const typeDistribution: { [key: string]: number } = {};
        let totalValue = 0;

        investments.forEach(investment => {
          const currentValue = investment.position.shares * investment.position.currentPrice;
          totalValue += currentValue;
          
          const type = investment.securityInfo.type;
          typeDistribution[type] = (typeDistribution[type] || 0) + currentValue;
        });

        // Check for over-concentration
        Object.entries(typeDistribution).forEach(([type, value]) => {
          const percentage = (value / totalValue) * 100;
          if (percentage > 70) {
            insights.push({
              type: 'warning',
              title: 'High Concentration Risk',
              description: `${percentage.toFixed(1)}% of your portfolio is in ${type}. Consider diversifying to reduce risk.`,
              priority: 'high'
            });
          }
        });

        // Check for small positions
        investments.forEach(investment => {
          const currentValue = investment.position.shares * investment.position.currentPrice;
          const percentage = (currentValue / totalValue) * 100;
          if (percentage < 2 && currentValue < 100) {
            insights.push({
              type: 'suggestion',
              title: 'Small Position Alert',
              description: `Your ${investment.securityInfo.symbol} position is very small (${percentage.toFixed(1)}%). Consider consolidating or increasing this position.`,
              priority: 'low'
            });
          }
        });

        // Performance insights
        const performers = investments.map(investment => {
          const currentValue = investment.position.shares * investment.position.currentPrice;
          const costBasis = investment.position.totalCost;
          const gainLossPercent = costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0;
          return { ...investment.toObject(), gainLossPercent };
        });

        const bestPerformer = performers.reduce((best, current) => 
          current.gainLossPercent > best.gainLossPercent ? current : best
        );

        const worstPerformer = performers.reduce((worst, current) => 
          current.gainLossPercent < worst.gainLossPercent ? current : worst
        );

        if (bestPerformer.gainLossPercent > 20) {
          insights.push({
            type: 'celebration',
            title: 'Strong Performer',
            description: `${bestPerformer.securityInfo.symbol} is up ${bestPerformer.gainLossPercent.toFixed(1)}%! Great choice!`,
            priority: 'medium'
          });
        }

        if (worstPerformer.gainLossPercent < -20) {
          insights.push({
            type: 'warning',
            title: 'Underperforming Asset',
            description: `${worstPerformer.securityInfo.symbol} is down ${Math.abs(worstPerformer.gainLossPercent).toFixed(1)}%. Consider reviewing this position.`,
            priority: 'medium'
          });
        }
      }

      res.json({
        success: true,
        data: insights
      });
    } catch (error) {
      logger.error('Error getting portfolio insights:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get advanced portfolio analytics
  static async getAdvancedAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User ID is required' });
        return;
      }

      const investments = await Investment.find({ userId, isActive: true });

      if (investments.length === 0) {
        res.json({
          success: true,
          data: {
            riskMetrics: { beta: 0, volatility: 0, sharpeRatio: 0, maxDrawdown: 0, var95: 0, correlation: 0 },
            individualAssets: [],
            portfolioComposition: []
          }
        });
        return;
      }

      // Calculate total portfolio value
      const totalValue = investments.reduce((sum, inv) => 
        sum + (inv.position.shares * inv.position.currentPrice), 0);

      // Prepare holdings data
      const holdings = investments.map(investment => ({
        symbol: investment.securityInfo.symbol,
        weight: (investment.position.shares * investment.position.currentPrice) / totalValue,
        currentValue: investment.position.shares * investment.position.currentPrice
      }));

      // Calculate comprehensive portfolio metrics
      const portfolioMetrics = await PortfolioController.analyticsService.calculatePortfolioMetrics(holdings);

      // Get individual asset analytics
      const individualAnalytics = await Promise.all(
        holdings.map(async (holding) => {
          try {
            const assetMetrics = await PortfolioController.analyticsService.calculateRiskMetrics(holding.symbol);
            return {
              symbol: holding.symbol,
              weight: holding.weight,
              analytics: assetMetrics
            };
          } catch (error) {
            logger.warn(`Failed to get analytics for ${holding.symbol}:`, error);
            return {
              symbol: holding.symbol,
              weight: holding.weight,
              analytics: {
                beta: 1.0,
                volatility: 20.0,
                sharpeRatio: 0.0,
                maxDrawdown: 0.0,
                var95: 0.0,
                correlation: 0.5
              }
            };
          }
        })
      );

      // Portfolio composition analysis
      const compositionAnalysis = holdings.map(holding => {
        const investment = investments.find(inv => inv.securityInfo.symbol === holding.symbol);
        const assetAnalytics = individualAnalytics.find(a => a.symbol === holding.symbol);
        return {
          symbol: holding.symbol,
          name: investment?.securityInfo.name || holding.symbol,
          type: investment?.securityInfo.type || 'unknown',
          percentage: Math.round(holding.weight * 10000) / 100, // Percentage with 2 decimals
          value: holding.currentValue,
          beta: assetAnalytics?.analytics?.beta || 1.0,
          volatility: assetAnalytics?.analytics?.volatility || 20.0
        };
      });

      // Risk concentration analysis
      const riskConcentration = {
        topHoldings: compositionAnalysis
          .sort((a, b) => b.percentage - a.percentage)
          .slice(0, 5)
          .map(holding => ({
            symbol: holding.symbol,
            name: holding.name,
            weight: holding.percentage
          })),
        concentrationRisk: Math.max(...holdings.map(h => h.weight)) > 0.3 ? 'High' : 
                          Math.max(...holdings.map(h => h.weight)) > 0.2 ? 'Medium' : 'Low'
      };

      // Sector/Type diversification
      const typeDistribution = compositionAnalysis.reduce((acc, holding) => {
        acc[holding.type] = (acc[holding.type] || 0) + (holding.percentage / 100);
        return acc;
      }, {} as { [key: string]: number });

      const diversificationScore = PortfolioController.calculateDiversificationScore(typeDistribution);
      
      // Calculate overall risk level based on portfolio metrics
      const calculateOverallRisk = () => {
        const maxWeight = Math.max(...holdings.map(h => h.weight));
        const highVolatility = portfolioMetrics.volatility > 20;
        const lowDiversification = diversificationScore < 40;
        const highConcentration = maxWeight > 0.3;
        
        if ((highVolatility && lowDiversification) || highConcentration) {
          return 'high';
        } else if (highVolatility || lowDiversification || maxWeight > 0.2) {
          return 'medium';
        } else {
          return 'low';
        }
      };

      res.json({
        success: true,
        data: {
          portfolioMetrics: {
            ...portfolioMetrics,
            totalValue,
            assetCount: investments.length,
            lastUpdated: new Date().toISOString()
          },
          individualAssets: individualAnalytics,
          composition: compositionAnalysis,
          riskAnalysis: {
            overall: calculateOverallRisk(),
            diversification: diversificationScore,
            concentration: Math.round(Math.max(...holdings.map(h => h.weight)) * 100),
            details: {
              concentration: riskConcentration,
              diversification: {
                byType: Object.entries(typeDistribution).map(([type, weight]) => ({
                  type,
                  weight: Math.round(weight * 100) / 100
                })),
                score: diversificationScore
              }
            }
          },
          benchmarkComparison: {
            benchmark: 'SPY',
            portfolioBeta: portfolioMetrics.beta,
            portfolioCorrelation: portfolioMetrics.correlation,
            relativeVolatility: portfolioMetrics.volatility > 15 ? 'Higher' : 
                               portfolioMetrics.volatility < 10 ? 'Lower' : 'Similar'
          }
        }
      });
    } catch (error) {
      logger.error('Error getting advanced portfolio analytics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Helper method for diversification score calculation
  private static calculateDiversificationScore(typeDistribution: { [key: string]: number }): number {
    const types = Object.keys(typeDistribution).length;
    const maxTypes = 6; // Maximum expected asset types
    const typeScore = Math.min(types / maxTypes, 1) * 50;

    // Calculate distribution evenness (lower variance = better diversification)
    const weights = Object.values(typeDistribution);
    const averageWeight = 1 / types;
    const variance = weights.reduce((sum, weight) => 
      sum + Math.pow(weight - averageWeight, 2), 0) / types;
    
    const distributionScore = Math.max(0, 50 - (variance * 200));
    
    return Math.round(typeScore + distributionScore);
  }
}
