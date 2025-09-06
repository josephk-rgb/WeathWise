import { apiService } from './api';
import { MockDataConfig, MockDataResponse, MockDataSummary } from '../types';

export class MockDataService {
  
  /**
   * Generate mock data for admin user
   */
  static async generateMockData(config: MockDataConfig): Promise<MockDataResponse> {
    try {
      return await apiService.generateMockData(config);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to generate mock data');
    }
  }

  /**
   * Get summary of current mock data
   */
  static async getDataSummary(): Promise<MockDataSummary> {
    try {
      return await apiService.getMockDataSummary();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to get data summary');
    }
  }

  /**
   * Clear all mock data for admin user
   */
  static async clearMockData(): Promise<{ success: boolean; message: string }> {
    try {
      return await apiService.clearMockData();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to clear mock data');
    }
  }

  /**
   * Get default configuration for mock data generation
   */
  static async getDefaultConfig(): Promise<MockDataConfig> {
    try {
      return await apiService.getMockDataConfig();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to get default config');
    }
  }
}

export default MockDataService;
