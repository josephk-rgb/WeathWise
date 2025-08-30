// Authentication test utility
import { apiService } from '../services/api';

export const testAuthentication = async (): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> => {
  try {
    console.log('Testing authentication...');
    
    // Test basic API connectivity
    const healthResponse = await fetch('http://localhost:3001/health');
    if (!healthResponse.ok) {
      return {
        success: false,
        message: 'Backend server is not responding',
        details: { status: healthResponse.status }
      };
    }
    
    console.log('Backend is running, testing authenticated endpoint...');
    
    // Test authenticated endpoint using our test route
    try {
      const testResponse = await apiService.testAuth();
      return {
        success: true,
        message: 'Authentication working correctly',
        details: testResponse
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Authentication required')) {
        return {
          success: false,
          message: 'Authentication failed - token invalid or missing',
          details: { error: error.message }
        };
      } else {
        return {
          success: false,
          message: 'Unexpected error during authentication test',
          details: { error: error instanceof Error ? error.message : String(error) }
        };
      }
    }
  } catch (error) {
    return {
      success: false,
      message: 'Failed to connect to backend',
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
};
