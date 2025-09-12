import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AssetsPage from '../pages/Assets';
import { UserContext } from '../contexts/UserContext';
import { apiService } from '../services/api';
import { Account, PhysicalAsset } from '../types';

// Mock the API service
vi.mock('../services/api', () => ({
  apiService: {
    getAccounts: vi.fn(),
    getAssets: vi.fn(),
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
    deleteAccount: vi.fn(),
    createAsset: vi.fn(),
    updateAsset: vi.fn(),
    deleteAsset: vi.fn(),
  },
}));

// Mock user context data
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User'
};

const mockUserContextValue = {
  isAuthenticated: true,
  isLoading: false,
  user: {
    sub: 'test-auth0-id',
    email: 'test@example.com',
    name: 'Test User'
  },
  userProfile: mockUser,
  isProfileLoading: false,
  profileError: null,
  isProfileComplete: true,
  login: vi.fn(),
  logout: vi.fn(),
  refreshProfile: vi.fn(),
  updateProfile: vi.fn()
};

// Test data
const mockAccounts: Account[] = [
  {
    id: 'account-1',
    userId: 'test-user-id',
    type: 'checking',
    name: 'Main Checking',
    institution: 'Test Bank',
    balance: 5000,
    currency: 'USD',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'account-2',
    userId: 'test-user-id',
    type: 'savings',
    name: 'Emergency Fund',
    institution: 'Credit Union',
    balance: 15000,
    currency: 'USD',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'account-3',
    userId: 'test-user-id',
    type: 'credit_card',
    name: 'Credit Card',
    institution: 'Bank Corp',
    balance: -2500,
    currency: 'USD',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const mockPhysicalAssets: PhysicalAsset[] = [
  {
    id: 'asset-1',
    userId: 'test-user-id',
    type: 'real_estate',
    name: 'Primary Residence',
    currentValue: 400000,
    equity: 250000,
    purchasePrice: 350000,
    currency: 'USD',
    hasLoan: true,
    loanInfo: {
      remainingBalance: 150000,
      monthlyPayment: 2000,
      lender: 'Mortgage Co',
      interestRate: 3.5,
      loanAmount: 200000,
      loanTerm: 30,
      startDate: new Date('2020-01-01')
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'asset-2',
    userId: 'test-user-id',
    type: 'vehicle',
    name: 'Family Car',
    currentValue: 25000,
    equity: 20000,
    purchasePrice: 30000,
    currency: 'USD',
    hasLoan: true,
    loanInfo: {
      remainingBalance: 5000,
      monthlyPayment: 300,
      lender: 'Auto Finance',
      interestRate: 4.0,
      loanAmount: 15000,
      loanTerm: 5,
      startDate: new Date('2022-01-01')
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'asset-3',
    userId: 'test-user-id',
    type: 'collectibles',
    name: 'Art Collection',
    currentValue: 15000,
    equity: 15000,
    purchasePrice: 12000,
    currency: 'USD',
    hasLoan: false,
    description: 'Modern art pieces',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Wrapper component for tests
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <UserContext.Provider value={mockUserContextValue}>
      {children}
    </UserContext.Provider>
  </BrowserRouter>
);

describe('Assets Page Frontend Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default API responses
    (apiService.getAccounts as any).mockResolvedValue(mockAccounts);
    (apiService.getAssets as any).mockResolvedValue(mockPhysicalAssets);
  });

  describe('Page Rendering and Layout', () => {
    it('should render the assets page with proper header', async () => {
      render(
        <TestWrapper>
          <AssetsPage />
        </TestWrapper>
      );

      // Check page title and description
      expect(screen.getByText('Assets & Accounts')).toBeInTheDocument();
      expect(screen.getByText('Manage your accounts, investments, and physical assets')).toBeInTheDocument();

      // Check action buttons
      expect(screen.getByText('Add Account')).toBeInTheDocument();
      expect(screen.getByText('Add Asset')).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      // Mock pending promises
      (apiService.getAccounts as any).mockImplementation(() => new Promise(() => {}));
      (apiService.getAssets as any).mockImplementation(() => new Promise(() => {}));

      render(
        <TestWrapper>
          <AssetsPage />
        </TestWrapper>
      );

      // Should show loading skeleton
      expect(document.querySelectorAll('.animate-pulse')).toHaveLength(1);
    });

    it('should display authentication prompt for unauthenticated users', () => {
      const unauthenticatedContext = {
        ...mockUserContextValue,
        isAuthenticated: false,
        userProfile: null,
        user: null
      };

      render(
        <BrowserRouter>
          <UserContext.Provider value={unauthenticatedContext}>
            <AssetsPage />
          </UserContext.Provider>
        </BrowserRouter>
      );

      expect(screen.getByText('Please log in to view your assets')).toBeInTheDocument();
    });
  });

  describe('Accounts Section', () => {
    it('should display all user accounts with correct information', async () => {
      render(
        <TestWrapper>
          <AssetsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Financial Accounts')).toBeInTheDocument();
      });

      // Check each account is displayed
      expect(screen.getByText('Main Checking')).toBeInTheDocument();
      expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
      expect(screen.getByText('Credit Card')).toBeInTheDocument();

      // Check account balances are formatted correctly
      expect(screen.getByText('$5,000.00')).toBeInTheDocument();
      expect(screen.getByText('$15,000.00')).toBeInTheDocument();
      expect(screen.getByText('-$2,500.00')).toBeInTheDocument();

      // Check institution names
      expect(screen.getByText('Test Bank')).toBeInTheDocument();
      expect(screen.getByText('Credit Union')).toBeInTheDocument();
      expect(screen.getByText('Bank Corp')).toBeInTheDocument();
    });

    it('should show account type indicators and icons', async () => {
      render(
        <TestWrapper>
          <AssetsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('checking')).toBeInTheDocument();
        expect(screen.getByText('savings')).toBeInTheDocument();
        expect(screen.getByText('credit')).toBeInTheDocument();
      });
    });

    it('should display empty state when no accounts exist', async () => {
      (apiService.getAccounts as any).mockResolvedValue([]);

      render(
        <TestWrapper>
          <AssetsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('No accounts yet')).toBeInTheDocument();
        expect(screen.getByText('Add your first account to start tracking your finances')).toBeInTheDocument();
        expect(screen.getByText('Add Your First Account')).toBeInTheDocument();
      });
    });

    it('should handle account edit and delete actions', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AssetsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Main Checking')).toBeInTheDocument();
      });

      // Find edit and delete buttons for the first account
      const accountCards = screen.getAllByTestId('account-card');
      const firstCard = accountCards[0];
      
      const editButton = within(firstCard).getByTestId('edit-account');
      const deleteButton = within(firstCard).getByTestId('delete-account');

      expect(editButton).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();

      // Test edit button click
      await user.click(editButton);
      // Should open account form modal (tested separately)

      // Test delete button click
      window.confirm = vi.fn(() => true);
      (apiService.deleteAccount as any).mockResolvedValue(undefined);
      
      await user.click(deleteButton);
      
      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete this account? This action cannot be undone.'
      );
      expect(apiService.deleteAccount).toHaveBeenCalledWith('account-1');
    });
  });

  describe('Physical Assets Section', () => {
    it('should display all physical assets with correct information', async () => {
      render(
        <TestWrapper>
          <AssetsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Physical Assets')).toBeInTheDocument();
      });

      // Check each asset is displayed
      expect(screen.getByText('Primary Residence')).toBeInTheDocument();
      expect(screen.getByText('Family Car')).toBeInTheDocument();
      expect(screen.getByText('Art Collection')).toBeInTheDocument();

      // Check asset values
      expect(screen.getByText('$400,000.00')).toBeInTheDocument();
      expect(screen.getByText('$25,000.00')).toBeInTheDocument();
      expect(screen.getByText('$15,000.00')).toBeInTheDocument();

      // Check equity calculations
      expect(screen.getByText('$250,000.00')).toBeInTheDocument(); // House equity
      expect(screen.getByText('$20,000.00')).toBeInTheDocument(); // Car equity
      // Art collection equity same as value (no loan)
    });

    it('should display loan information when present', async () => {
      render(
        <TestWrapper>
          <AssetsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Primary Residence')).toBeInTheDocument();
      });

      // Check loan balance is displayed
      expect(screen.getByText('$150,000.00')).toBeInTheDocument(); // House loan
      expect(screen.getByText('$5,000.00')).toBeInTheDocument(); // Car loan

      // Check lender information
      expect(screen.getByText('Mortgage Co')).toBeInTheDocument();
      expect(screen.getByText('Auto Finance')).toBeInTheDocument();
    });

    it('should show asset type indicators', async () => {
      render(
        <TestWrapper>
          <AssetsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('real estate')).toBeInTheDocument();
        expect(screen.getByText('vehicle')).toBeInTheDocument();
        expect(screen.getByText('collectible')).toBeInTheDocument();
      });
    });

    it('should display empty state when no assets exist', async () => {
      (apiService.getAssets as any).mockResolvedValue([]);

      render(
        <TestWrapper>
          <AssetsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('No physical assets yet')).toBeInTheDocument();
        expect(screen.getByText('Track your real estate, vehicles, and other valuable assets to get a complete picture of your net worth.')).toBeInTheDocument();
        expect(screen.getByText('Add Your First Asset')).toBeInTheDocument();
      });
    });
  });

  describe('Form Modals', () => {
    it('should open account form modal when Add Account is clicked', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AssetsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Add Account')).toBeInTheDocument();
      });

      const addAccountButton = screen.getByText('Add Account');
      await user.click(addAccountButton);

      // Modal should open (assuming AccountFormModal is properly rendered)
      await waitFor(() => {
        expect(screen.getByTestId('account-form-modal')).toBeInTheDocument();
      });
    });

    it('should open asset form modal when Add Asset is clicked', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AssetsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Add Asset')).toBeInTheDocument();
      });

      const addAssetButton = screen.getByText('Add Asset');
      await user.click(addAssetButton);

      // Modal should open (assuming AssetFormModal is properly rendered)
      await waitFor(() => {
        expect(screen.getByTestId('asset-form-modal')).toBeInTheDocument();
      });
    });

    it('should close modals when cancel is clicked', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AssetsPage />
        </TestWrapper>
      );

      // Open account modal
      await user.click(screen.getByText('Add Account'));
      
      await waitFor(() => {
        expect(screen.getByTestId('account-form-modal')).toBeInTheDocument();
      });

      // Click cancel
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByTestId('account-form-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Data Operations', () => {
    it('should handle successful account creation', async () => {
      const user = userEvent.setup();
      const newAccount: Account = {
        id: 'new-account',
        userId: 'test-user-id',
        type: 'savings',
        name: 'New Savings',
        institution: 'New Bank',
        balance: 10000,
        currency: 'USD',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (apiService.createAccount as any).mockResolvedValue(newAccount);

      render(
        <TestWrapper>
          <AssetsPage />
        </TestWrapper>
      );

      // Open form and submit
      await user.click(screen.getByText('Add Account'));
      
      // Simulate form submission (details depend on form implementation)
      const submitButton = await screen.findByText('Add Account');
      await user.click(submitButton);

      // Should refresh data
      expect(apiService.getAccounts).toHaveBeenCalledTimes(2); // Initial + refresh
    });

    it('should handle API errors gracefully', async () => {
      (apiService.getAccounts as any).mockRejectedValue(new Error('API Error'));
      (apiService.getAssets as any).mockRejectedValue(new Error('API Error'));

      // Mock console.error to prevent error output in tests
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <TestWrapper>
          <AssetsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error loading assets data:', expect.any(Error));
      });

      // Should show error state
      expect(screen.getByText('Failed to load assets data. Please try again.')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('should refresh data after successful operations', async () => {
      const user = userEvent.setup();

      (apiService.deleteAccount as any).mockResolvedValue(undefined);

      render(
        <TestWrapper>
          <AssetsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Main Checking')).toBeInTheDocument();
      });

      // Delete an account
      window.confirm = vi.fn(() => true);
      const deleteButton = screen.getAllByTestId('delete-account')[0];
      await user.click(deleteButton);

      await waitFor(() => {
        // Should call API to refresh data
        expect(apiService.getAccounts).toHaveBeenCalledTimes(2); // Initial + refresh
        expect(apiService.getAssets).toHaveBeenCalledTimes(2); // Initial + refresh
      });
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile screens', () => {
      // Mock mobile screen size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <TestWrapper>
          <AssetsPage />
        </TestWrapper>
      );

      // Check that responsive classes are applied
      const container = screen.getByRole('main') || document.querySelector('.max-w-7xl');
      expect(container).toHaveClass('px-4'); // Mobile padding class
    });

    it('should show proper grid layout on different screen sizes', async () => {
      render(
        <TestWrapper>
          <AssetsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Financial Accounts')).toBeInTheDocument();
      });

      // Check grid containers have responsive classes
      const grids = document.querySelectorAll('.grid');
      grids.forEach(grid => {
        expect(grid).toHaveClass('grid-cols-1'); // Mobile first
        expect(grid).toHaveClass('md:grid-cols-2'); // Tablet
        expect(grid).toHaveClass('lg:grid-cols-3'); // Desktop
      });
    });
  });

  describe('Currency Formatting', () => {
    it('should format positive amounts correctly', async () => {
      render(
        <TestWrapper>
          <AssetsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        // Positive amounts should show as currency
        expect(screen.getByText('$5,000.00')).toBeInTheDocument();
        expect(screen.getByText('$15,000.00')).toBeInTheDocument();
        expect(screen.getByText('$400,000.00')).toBeInTheDocument();
      });
    });

    it('should format negative amounts correctly', async () => {
      render(
        <TestWrapper>
          <AssetsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        // Credit card balance (negative) should show with minus sign
        expect(screen.getByText('-$2,500.00')).toBeInTheDocument();
      });
    });

    it('should handle different currencies', async () => {
      const eurAccount = {
        ...mockAccounts[0],
        currency: 'EUR',
        balance: 5000
      };

      (apiService.getAccounts as any).mockResolvedValue([eurAccount]);

      render(
        <TestWrapper>
          <AssetsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        // Should format EUR currency correctly
        expect(screen.getByText('€5,000.00')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      render(
        <TestWrapper>
          <AssetsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Financial Accounts')).toBeInTheDocument();
      });

      // Check buttons have accessible names
      const addAccountButton = screen.getByText('Add Account');
      expect(addAccountButton).toHaveAttribute('type', 'button');

      const addAssetButton = screen.getByText('Add Asset');
      expect(addAssetButton).toHaveAttribute('type', 'button');

      // Check edit and delete buttons have proper labels
      const editButtons = screen.getAllByLabelText(/edit/i);
      const deleteButtons = screen.getAllByLabelText(/delete/i);
      
      expect(editButtons.length).toBeGreaterThan(0);
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AssetsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Add Account')).toBeInTheDocument();
      });

      // Test tab navigation
      await user.tab();
      expect(screen.getByText('Add Account')).toHaveFocus();

      await user.tab();
      expect(screen.getByText('Add Asset')).toHaveFocus();

      // Test enter key activation
      await user.keyboard('{Enter}');
      // Should open asset form modal
    });

    it('should have proper heading hierarchy', async () => {
      render(
        <TestWrapper>
          <AssetsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Assets & Accounts')).toBeInTheDocument();
      });

      // Check heading levels
      expect(screen.getByRole('heading', { level: 1, name: 'Assets & Accounts' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Financial Accounts' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Physical Assets' })).toBeInTheDocument();
    });
  });
});
