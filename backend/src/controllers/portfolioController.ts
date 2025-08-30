import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Investment, IInvestment } from '../models';
import { logger } from '../utils/logger';

export class PortfolioController {
  // Get portfolio overview
  static async getPortfolioOverview(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const investments = await Investment.find({ userId, isActive: true });

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

      res.json({
        success: true,
        data: {
          totalValue,
          totalCost,
          totalGainLoss,
          totalReturn,
          investmentCount: investments.length,
          assetAllocation: assetAllocationPercent,
          lastUpdated: new Date()
        }
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

      res.json({
        success: true,
        data: {
          period,
          dateRange: { startDate, endDate },
          investments: performanceData,
          summary: {
            totalInvestments: performanceData.length,
            bestPerformer: performanceData[0] || null,
            worstPerformer: performanceData[performanceData.length - 1] || null
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
          riskMetrics: {
            beta: 1.0, // Placeholder - would need market data for real calculation
            volatility: 15.0 // Placeholder - would need historical data
          },
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
}
