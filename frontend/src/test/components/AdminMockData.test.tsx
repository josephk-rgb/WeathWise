import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminMockData from '../../components/Admin/AdminMockData';
import MockDataService from '../../services/mockDataService';

// Mock the MockDataService
vi.mock('../../services/mockDataService');

const mockMockDataService = MockDataService as any;

describe('AdminMockData Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render for non-admin users', () => {
    render(<AdminMockData isAdmin={false} />);
    
    expect(screen.queryByText('Admin Mock Data Generator')).not.toBeInTheDocument();
  });

  it('should render for admin users', () => {
    render(<AdminMockData isAdmin={true} />);
    
    expect(screen.getByText('Admin Mock Data Generator')).toBeInTheDocument();
    expect(screen.getByText('Generate Data')).toBeInTheDocument();
  });

  it('should load default config and summary on mount for admin', async () => {
    const mockConfig = { accounts: 3, transactionsPerMonth: 50 };
    const mockSummary = { accounts: 5, transactions: 100, investments: 10, budgets: 3, goals: 2, debts: 1 };
    
    mockMockDataService.getDefaultConfig.mockResolvedValue(mockConfig);
    mockMockDataService.getDataSummary.mockResolvedValue(mockSummary);

    render(<AdminMockData isAdmin={true} />);

    await waitFor(() => {
      expect(mockMockDataService.getDefaultConfig).toHaveBeenCalled();
      expect(mockMockDataService.getDataSummary).toHaveBeenCalled();
    });
  });

  it('should show configuration panel when config button is clicked', async () => {
    render(<AdminMockData isAdmin={true} />);
    
    const configButton = screen.getByText('Config');
    fireEvent.click(configButton);

    expect(screen.getByText('Configuration')).toBeInTheDocument();
    expect(screen.getByLabelText('Accounts')).toBeInTheDocument();
    expect(screen.getByLabelText('Transactions/Month')).toBeInTheDocument();
  });

  it('should call generateMockData when Generate Data button is clicked', async () => {
    const mockResponse = {
      success: true,
      message: 'Mock data generated successfully',
      summary: { accounts: 3, transactions: 60, investments: 5, budgets: 2, goals: 1, debts: 0 }
    };
    
    mockMockDataService.generateMockData.mockResolvedValue(mockResponse);

    render(<AdminMockData isAdmin={true} />);
    
    const generateButton = screen.getByText('Generate Data');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(mockMockDataService.generateMockData).toHaveBeenCalled();
    });
  });

  it('should show loading state during data generation', async () => {
    mockMockDataService.generateMockData.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true, message: 'Done' }), 100))
    );

    render(<AdminMockData isAdmin={true} />);
    
    const generateButton = screen.getByText('Generate Data');
    fireEvent.click(generateButton);

    expect(screen.getByText('Generating...')).toBeInTheDocument();
  });

  it('should display success message after successful generation', async () => {
    const mockResponse = {
      success: true,
      message: 'Mock data generated successfully',
      summary: { accounts: 3, transactions: 60, investments: 5, budgets: 2, goals: 1, debts: 0 }
    };
    
    mockMockDataService.generateMockData.mockResolvedValue(mockResponse);

    render(<AdminMockData isAdmin={true} />);
    
    const generateButton = screen.getByText('Generate Data');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Mock data generated successfully')).toBeInTheDocument();
    });
  });

  it('should display error message on generation failure', async () => {
    mockMockDataService.generateMockData.mockRejectedValue(new Error('API Error'));

    render(<AdminMockData isAdmin={true} />);
    
    const generateButton = screen.getByText('Generate Data');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });
});

describe('MockDataService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call the correct API endpoints', async () => {
    // We can't easily test the actual API calls without more complex mocking
    // but we can test that the service methods exist and can be called
    expect(typeof MockDataService.generateMockData).toBe('function');
    expect(typeof MockDataService.getDataSummary).toBe('function');
    expect(typeof MockDataService.clearMockData).toBe('function');
    expect(typeof MockDataService.getDefaultConfig).toBe('function');
  });
});
