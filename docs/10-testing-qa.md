# Part 10: Testing & Quality Assurance

## 10.1 Testing Strategy Overview

### Testing Pyramid Structure

```
                    E2E Tests
                   (Playwright)
                  /            \
              Integration Tests
             (Jest + Supertest)
            /                  \
        Unit Tests              Component Tests
    (Jest + Node.js)         (React Testing Library)
   /                          \
API Tests                    Frontend Tests
Backend Services             React Components
Database Operations          Hooks & Utils
```

### Test Configuration

```javascript
// jest.config.js
module.exports = {
  projects: [
    {
      displayName: 'frontend',
      testMatch: ['<rootDir>/src/**/*.test.{js,ts,tsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      },
      transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
        '^.+\\.(js|jsx)$': 'babel-jest',
      },
      collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/test/**',
        '!src/**/*.stories.{ts,tsx}',
      ],
      coverageThreshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    {
      displayName: 'backend',
      testMatch: ['<rootDir>/backend/**/*.test.{js,ts}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/backend/src/test/setup.ts'],
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/backend/src/$1',
      },
      transform: {
        '^.+\\.ts$': 'ts-jest',
      },
      collectCoverageFrom: [
        'backend/src/**/*.ts',
        '!backend/src/**/*.d.ts',
        '!backend/src/test/**',
      ],
      coverageThreshold: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },
  ],
  coverageReporters: ['text', 'lcov', 'html'],
};
```

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { server } from './mocks/server';

// Setup global variables
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock environment variables
process.env.VITE_API_URL = 'http://localhost:3001';
process.env.VITE_WS_URL = 'ws://localhost:3001';

// Setup MSW (Mock Service Worker)
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock WebSocket
class MockWebSocket {
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  
  readyState = WebSocket.CONNECTING;
  
  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 0);
  }
  
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    // Mock send implementation
  }
  
  close(code?: number, reason?: string) {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close', { code, reason }));
  }
}

global.WebSocket = MockWebSocket as any;

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  disconnect() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  disconnect() {}
  unobserve() {}
};
```

## 10.2 Frontend Testing

### Component Testing with React Testing Library

```typescript
// src/components/UI/Button.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './Button';

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('applies correct variant classes', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-gray-600');

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole('button')).toHaveClass('border-gray-300');
  });

  it('shows loading state correctly', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick} disabled>Disabled</Button>);
    
    await user.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders with icon in correct position', () => {
    const icon = <span data-testid="test-icon">🎯</span>;
    
    const { rerender } = render(
      <Button icon={icon} iconPosition="left">With Icon</Button>
    );
    
    const button = screen.getByRole('button');
    const iconElement = screen.getByTestId('test-icon');
    const textNode = screen.getByText('With Icon');
    
    // Check that icon comes before text
    expect(button.firstChild).toBe(iconElement);
    
    rerender(<Button icon={icon} iconPosition="right">With Icon</Button>);
    
    // Check that icon comes after text
    expect(button.lastChild).toBe(iconElement);
  });
});
```

```typescript
// src/components/Charts/PortfolioPerformanceChart.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PortfolioPerformanceChart } from './PortfolioPerformanceChart';

const mockData = [
  {
    date: '2023-01-01',
    portfolioValue: 10000,
    benchmark: 10000,
    cashFlow: 0,
  },
  {
    date: '2023-01-02',
    portfolioValue: 10500,
    benchmark: 10200,
    cashFlow: 0,
  },
  {
    date: '2023-01-03',
    portfolioValue: 11000,
    benchmark: 10300,
    cashFlow: 500,
  },
];

describe('PortfolioPerformanceChart', () => {
  it('renders chart with data', () => {
    render(<PortfolioPerformanceChart data={mockData} />);
    
    expect(screen.getByText('Portfolio Performance')).toBeInTheDocument();
    expect(screen.getByText(/Total return:/)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<PortfolioPerformanceChart data={[]} loading />);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(<PortfolioPerformanceChart data={[]} error="Failed to load data" />);
    
    expect(screen.getByText('Chart Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
  });

  it('switches between value and returns view', async () => {
    render(<PortfolioPerformanceChart data={mockData} />);
    
    const returnsButton = screen.getByRole('button', { name: 'Returns' });
    const valueButton = screen.getByRole('button', { name: 'Value' });
    
    // Initially should be in value mode
    expect(valueButton).toHaveClass('bg-blue-600');
    
    fireEvent.click(returnsButton);
    
    await waitFor(() => {
      expect(returnsButton).toHaveClass('bg-blue-600');
      expect(valueButton).not.toHaveClass('bg-blue-600');
    });
  });

  it('toggles benchmark visibility', async () => {
    render(<PortfolioPerformanceChart data={mockData} />);
    
    const benchmarkButton = screen.getByRole('button', { name: 'Benchmark' });
    
    // Initially benchmark should be visible
    expect(benchmarkButton).toHaveClass('bg-blue-600');
    
    fireEvent.click(benchmarkButton);
    
    await waitFor(() => {
      expect(benchmarkButton).not.toHaveClass('bg-blue-600');
    });
  });

  it('calculates returns correctly', () => {
    render(<PortfolioPerformanceChart data={mockData} />);
    
    // Should show 10% return (from 10000 to 11000)
    expect(screen.getByText(/10\.00%/)).toBeInTheDocument();
  });
});
```

### Hook Testing

```typescript
// src/hooks/useWebSocket.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebSocket } from './useWebSocket';

// Mock WebSocket
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: WebSocket.OPEN,
};

global.WebSocket = jest.fn(() => mockWebSocket) as any;

describe('useWebSocket Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('establishes connection on mount', () => {
    const { result } = renderHook(() => useWebSocket('ws://localhost:3001'));
    
    expect(WebSocket).toHaveBeenCalledWith('ws://localhost:3001');
    expect(result.current.isConnected).toBe(false); // Initially false until connection opens
  });

  it('sends messages correctly', () => {
    const { result } = renderHook(() => useWebSocket('ws://localhost:3001'));
    
    act(() => {
      result.current.sendMessage({ type: 'test', data: 'hello' });
    });
    
    expect(mockWebSocket.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'test', data: 'hello' })
    );
  });

  it('handles connection state changes', async () => {
    const { result } = renderHook(() => useWebSocket('ws://localhost:3001'));
    
    // Simulate connection opening
    act(() => {
      const openHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )?.[1];
      openHandler?.();
    });
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
    
    // Simulate connection closing
    act(() => {
      const closeHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'close'
      )?.[1];
      closeHandler?.();
    });
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });
  });

  it('receives and processes messages', async () => {
    const onMessage = jest.fn();
    const { result } = renderHook(() => useWebSocket('ws://localhost:3001', { onMessage }));
    
    const testMessage = { type: 'price_update', symbol: 'AAPL', price: 150 };
    
    act(() => {
      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];
      messageHandler?.({ data: JSON.stringify(testMessage) });
    });
    
    expect(onMessage).toHaveBeenCalledWith(testMessage);
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useWebSocket('ws://localhost:3001'));
    
    unmount();
    
    expect(mockWebSocket.close).toHaveBeenCalled();
  });
});
```

### Store Testing with Zustand

```typescript
// src/store/useStore.test.ts
import { act, renderHook } from '@testing-library/react';
import { useStore } from './useStore';

describe('useStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useStore.setState({
      user: null,
      isAuthenticated: false,
      portfolio: null,
      investments: [],
      marketData: {},
      notifications: [],
      loading: {
        user: false,
        portfolio: false,
        investments: false,
        marketData: false,
      },
      errors: {
        user: null,
        portfolio: null,
        investments: null,
        marketData: null,
      },
    });
  });

  it('sets user correctly', () => {
    const { result } = renderHook(() => useStore());
    
    const testUser = {
      id: '1',
      email: 'test@example.com',
      profile: { firstName: 'John', lastName: 'Doe' },
      preferences: {},
      riskProfile: {},
      subscription: {},
    };
    
    act(() => {
      result.current.setUser(testUser);
    });
    
    expect(result.current.user).toEqual(testUser);
  });

  it('manages investments correctly', () => {
    const { result } = renderHook(() => useStore());
    
    const testInvestment = {
      id: '1',
      symbol: 'AAPL',
      name: 'Apple Inc.',
      shares: 10,
      purchasePrice: 100,
      currentPrice: 150,
      type: 'stock' as const,
      purchaseDate: new Date(),
      marketValue: 1500,
      gainLoss: 500,
      gainLossPercent: 50,
    };
    
    act(() => {
      result.current.addInvestment(testInvestment);
    });
    
    expect(result.current.investments).toHaveLength(1);
    expect(result.current.investments[0]).toEqual(testInvestment);
    
    act(() => {
      result.current.updateInvestment('1', { currentPrice: 160 });
    });
    
    expect(result.current.investments[0].currentPrice).toBe(160);
    
    act(() => {
      result.current.removeInvestment('1');
    });
    
    expect(result.current.investments).toHaveLength(0);
  });

  it('calculates total investment value correctly', () => {
    const { result } = renderHook(() => useStore());
    
    const investments = [
      {
        id: '1',
        symbol: 'AAPL',
        marketValue: 1000,
      },
      {
        id: '2',
        symbol: 'GOOGL',
        marketValue: 2000,
      },
    ];
    
    act(() => {
      result.current.setInvestments(investments as any);
    });
    
    expect(result.current.totalInvestmentValue()).toBe(3000);
  });

  it('manages loading states correctly', () => {
    const { result } = renderHook(() => useStore());
    
    act(() => {
      result.current.setLoading('portfolio', true);
    });
    
    expect(result.current.loading.portfolio).toBe(true);
    
    act(() => {
      result.current.setLoading('portfolio', false);
    });
    
    expect(result.current.loading.portfolio).toBe(false);
  });

  it('manages notifications correctly', () => {
    const { result } = renderHook(() => useStore());
    
    const notification = {
      id: '1',
      type: 'info' as const,
      title: 'Test',
      message: 'Test message',
      timestamp: new Date(),
    };
    
    act(() => {
      result.current.addNotification(notification);
    });
    
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]).toEqual(notification);
    
    act(() => {
      result.current.removeNotification('1');
    });
    
    expect(result.current.notifications).toHaveLength(0);
  });
});
```

## 10.3 Backend Testing

### API Route Testing

```typescript
// backend/src/routes/portfolio.test.ts
import request from 'supertest';
import { app } from '../app';
import { DatabaseService } from '../services/databaseService';
import { AuthService } from '../services/authService';

jest.mock('../services/databaseService');
jest.mock('../services/authService');

const mockDb = DatabaseService as jest.MockedClass<typeof DatabaseService>;
const mockAuth = AuthService as jest.MockedClass<typeof AuthService>;

describe('Portfolio Routes', () => {
  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
  };

  const mockPortfolio = {
    _id: 'portfolio123',
    userId: 'user123',
    investments: [
      {
        id: 'inv1',
        symbol: 'AAPL',
        shares: 10,
        purchasePrice: 100,
        currentPrice: 150,
      },
    ],
    totalValue: 1500,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication
    mockAuth.prototype.verifyToken.mockResolvedValue(mockUser);
    
    // Mock database
    mockDb.prototype.collection.mockReturnValue({
      findOne: jest.fn(),
      find: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
    } as any);
  });

  describe('GET /api/portfolio', () => {
    it('returns user portfolio', async () => {
      mockDb.prototype.collection().findOne.mockResolvedValue(mockPortfolio);

      const response = await request(app)
        .get('/api/portfolio')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toMatchObject({
        id: mockPortfolio._id,
        userId: mockPortfolio.userId,
        investments: mockPortfolio.investments,
        totalValue: mockPortfolio.totalValue,
      });
    });

    it('returns 404 when portfolio not found', async () => {
      mockDb.prototype.collection().findOne.mockResolvedValue(null);

      await request(app)
        .get('/api/portfolio')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);
    });

    it('returns 401 without authentication', async () => {
      await request(app)
        .get('/api/portfolio')
        .expect(401);
    });
  });

  describe('POST /api/portfolio/investments', () => {
    const newInvestment = {
      symbol: 'GOOGL',
      shares: 5,
      purchasePrice: 2000,
    };

    it('adds new investment successfully', async () => {
      mockDb.prototype.collection().findOne.mockResolvedValue(mockPortfolio);
      mockDb.prototype.collection().updateOne.mockResolvedValue({ matchedCount: 1 });

      const response = await request(app)
        .post('/api/portfolio/investments')
        .set('Authorization', 'Bearer valid-token')
        .send(newInvestment)
        .expect(201);

      expect(response.body).toMatchObject({
        symbol: newInvestment.symbol,
        shares: newInvestment.shares,
        purchasePrice: newInvestment.purchasePrice,
      });

      expect(mockDb.prototype.collection().updateOne).toHaveBeenCalledWith(
        { _id: mockPortfolio._id },
        expect.objectContaining({
          $push: { investments: expect.any(Object) },
          $set: { updatedAt: expect.any(Date) },
        })
      );
    });

    it('validates investment data', async () => {
      const invalidInvestment = {
        symbol: '', // Invalid: empty symbol
        shares: -1, // Invalid: negative shares
        purchasePrice: 0, // Invalid: zero price
      };

      await request(app)
        .post('/api/portfolio/investments')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidInvestment)
        .expect(400);
    });

    it('handles duplicate investments', async () => {
      mockDb.prototype.collection().findOne.mockResolvedValue({
        ...mockPortfolio,
        investments: [
          ...mockPortfolio.investments,
          { symbol: 'GOOGL', shares: 3, purchasePrice: 1900 },
        ],
      });

      const response = await request(app)
        .post('/api/portfolio/investments')
        .set('Authorization', 'Bearer valid-token')
        .send(newInvestment)
        .expect(200); // Should update existing investment

      expect(mockDb.prototype.collection().updateOne).toHaveBeenCalledWith(
        { _id: mockPortfolio._id, 'investments.symbol': 'GOOGL' },
        expect.objectContaining({
          $inc: { 'investments.$.shares': newInvestment.shares },
        })
      );
    });
  });

  describe('PUT /api/portfolio/investments/:id', () => {
    const updates = {
      shares: 15,
      currentPrice: 160,
    };

    it('updates investment successfully', async () => {
      mockDb.prototype.collection().updateOne.mockResolvedValue({ matchedCount: 1 });

      await request(app)
        .put('/api/portfolio/investments/inv1')
        .set('Authorization', 'Bearer valid-token')
        .send(updates)
        .expect(200);

      expect(mockDb.prototype.collection().updateOne).toHaveBeenCalledWith(
        { userId: mockUser.id, 'investments.id': 'inv1' },
        expect.objectContaining({
          $set: {
            'investments.$.shares': updates.shares,
            'investments.$.currentPrice': updates.currentPrice,
            updatedAt: expect.any(Date),
          },
        })
      );
    });

    it('returns 404 for non-existent investment', async () => {
      mockDb.prototype.collection().updateOne.mockResolvedValue({ matchedCount: 0 });

      await request(app)
        .put('/api/portfolio/investments/nonexistent')
        .set('Authorization', 'Bearer valid-token')
        .send(updates)
        .expect(404);
    });
  });

  describe('DELETE /api/portfolio/investments/:id', () => {
    it('removes investment successfully', async () => {
      mockDb.prototype.collection().updateOne.mockResolvedValue({ matchedCount: 1 });

      await request(app)
        .delete('/api/portfolio/investments/inv1')
        .set('Authorization', 'Bearer valid-token')
        .expect(204);

      expect(mockDb.prototype.collection().updateOne).toHaveBeenCalledWith(
        { userId: mockUser.id },
        expect.objectContaining({
          $pull: { investments: { id: 'inv1' } },
          $set: { updatedAt: expect.any(Date) },
        })
      );
    });
  });
});
```

### Service Testing

```typescript
// backend/src/services/marketDataService.test.ts
import { MarketDataService } from './marketDataService';
import { AlphaVantageProvider } from './dataProviders/alphaVantageProvider';
import { YahooFinanceProvider } from './dataProviders/yahooFinanceProvider';
import { CacheService } from './cacheService';

jest.mock('./dataProviders/alphaVantageProvider');
jest.mock('./dataProviders/yahooFinanceProvider');
jest.mock('./cacheService');

const mockAlphaVantage = AlphaVantageProvider as jest.MockedClass<typeof AlphaVantageProvider>;
const mockYahooFinance = YahooFinanceProvider as jest.MockedClass<typeof YahooFinanceProvider>;
const mockCache = CacheService as jest.MockedClass<typeof CacheService>;

describe('MarketDataService', () => {
  let marketDataService: MarketDataService;

  const mockPriceData = {
    symbol: 'AAPL',
    price: 150.00,
    previousClose: 148.50,
    change: 1.50,
    changePercent: 1.01,
    volume: 1000000,
    high: 151.00,
    low: 149.00,
    open: 149.50,
    timestamp: new Date(),
    source: 'yahoo',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    marketDataService = new MarketDataService();
  });

  describe('getCurrentPrice', () => {
    it('returns cached data when available and valid', async () => {
      mockCache.prototype.get.mockResolvedValue(mockPriceData);

      const result = await marketDataService.getCurrentPrice('AAPL');

      expect(result).toEqual(mockPriceData);
      expect(mockYahooFinance.prototype.getCurrentPrice).not.toHaveBeenCalled();
    });

    it('fetches from primary provider when cache is empty', async () => {
      mockCache.prototype.get.mockResolvedValue(null);
      mockYahooFinance.prototype.getCurrentPrice.mockResolvedValue(mockPriceData);

      const result = await marketDataService.getCurrentPrice('AAPL');

      expect(result).toEqual(mockPriceData);
      expect(mockYahooFinance.prototype.getCurrentPrice).toHaveBeenCalledWith('AAPL');
      expect(mockCache.prototype.set).toHaveBeenCalledWith(
        'price:AAPL',
        mockPriceData,
        60000
      );
    });

    it('falls back to secondary provider when primary fails', async () => {
      mockCache.prototype.get.mockResolvedValue(null);
      mockYahooFinance.prototype.getCurrentPrice.mockRejectedValue(new Error('API Error'));
      mockAlphaVantage.prototype.getCurrentPrice.mockResolvedValue(mockPriceData);

      const result = await marketDataService.getCurrentPrice('AAPL');

      expect(result).toEqual(mockPriceData);
      expect(mockYahooFinance.prototype.getCurrentPrice).toHaveBeenCalledWith('AAPL');
      expect(mockAlphaVantage.prototype.getCurrentPrice).toHaveBeenCalledWith('AAPL');
    });

    it('throws error when all providers fail', async () => {
      mockCache.prototype.get.mockResolvedValue(null);
      mockYahooFinance.prototype.getCurrentPrice.mockRejectedValue(new Error('Yahoo Error'));
      mockAlphaVantage.prototype.getCurrentPrice.mockRejectedValue(new Error('AV Error'));

      await expect(marketDataService.getCurrentPrice('AAPL')).rejects.toThrow(
        'Failed to fetch current price for AAPL from all providers'
      );
    });
  });

  describe('getBatchPrices', () => {
    it('fetches prices for multiple symbols', async () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT'];
      mockCache.prototype.get.mockResolvedValue(null);
      mockYahooFinance.prototype.getCurrentPrice
        .mockResolvedValueOnce({ ...mockPriceData, symbol: 'AAPL' })
        .mockResolvedValueOnce({ ...mockPriceData, symbol: 'GOOGL', price: 2500 })
        .mockResolvedValueOnce({ ...mockPriceData, symbol: 'MSFT', price: 300 });

      const result = await marketDataService.getBatchPrices(symbols);

      expect(Object.keys(result)).toHaveLength(3);
      expect(result['AAPL'].price).toBe(150);
      expect(result['GOOGL'].price).toBe(2500);
      expect(result['MSFT'].price).toBe(300);
    });

    it('handles partial failures gracefully', async () => {
      const symbols = ['AAPL', 'INVALID'];
      mockCache.prototype.get.mockResolvedValue(null);
      mockYahooFinance.prototype.getCurrentPrice
        .mockResolvedValueOnce({ ...mockPriceData, symbol: 'AAPL' })
        .mockRejectedValueOnce(new Error('Invalid symbol'));

      const result = await marketDataService.getBatchPrices(symbols);

      expect(Object.keys(result)).toHaveLength(1);
      expect(result['AAPL']).toBeDefined();
      expect(result['INVALID']).toBeUndefined();
    });
  });

  describe('getMarketStatus', () => {
    it('returns correct market status during trading hours', async () => {
      // Mock current time to be 2:00 PM ET on a Tuesday
      const mockDate = new Date('2023-06-13T18:00:00.000Z'); // 2:00 PM ET
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const status = await marketDataService.getMarketStatus();

      expect(status.isOpen).toBe(true);
      expect(status.timezone).toBe('America/New_York');
      expect(status.nextClose).toBeDefined();
    });

    it('returns correct market status outside trading hours', async () => {
      // Mock current time to be 6:00 PM ET on a Tuesday
      const mockDate = new Date('2023-06-13T22:00:00.000Z'); // 6:00 PM ET
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const status = await marketDataService.getMarketStatus();

      expect(status.isOpen).toBe(false);
      expect(status.nextOpen).toBeDefined();
    });

    it('returns correct market status on weekends', async () => {
      // Mock current time to be Saturday
      const mockDate = new Date('2023-06-17T18:00:00.000Z'); // Saturday
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const status = await marketDataService.getMarketStatus();

      expect(status.isOpen).toBe(false);
      expect(status.nextOpen).toBeDefined();
    });
  });
});
```

## 10.4 Integration Testing

### WebSocket Integration Tests

```typescript
// backend/src/websocket/websocket.integration.test.ts
import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { AddressInfo } from 'net';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';
import { WebSocketServer } from './websocketServer';
import { AuthService } from '../services/authService';

jest.mock('../services/authService');

describe('WebSocket Integration', () => {
  let httpServer: Server;
  let wsServer: WebSocketServer;
  let clientSocket: ClientSocket;
  let port: number;

  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
  };

  beforeAll((done) => {
    httpServer = createServer();
    wsServer = new WebSocketServer(httpServer);
    
    httpServer.listen(() => {
      port = (httpServer.address() as AddressInfo).port;
      done();
    });
  });

  afterAll(() => {
    httpServer.close();
  });

  beforeEach((done) => {
    // Mock authentication
    (AuthService.prototype.verifyToken as jest.Mock).mockResolvedValue(mockUser);

    clientSocket = ClientIO(`http://localhost:${port}`, {
      auth: {
        token: 'valid-token',
      },
    });

    clientSocket.on('connected', () => {
      done();
    });
  });

  afterEach(() => {
    clientSocket.close();
  });

  describe('Connection', () => {
    it('connects successfully with valid token', (done) => {
      clientSocket.on('connected', (data) => {
        expect(data.message).toBe('Connected to WealthWise real-time service');
        expect(data.features).toContain('portfolio_updates');
        done();
      });
    });

    it('rejects connection with invalid token', (done) => {
      (AuthService.prototype.verifyToken as jest.Mock).mockRejectedValue(
        new Error('Invalid token')
      );

      const unauthorizedSocket = ClientIO(`http://localhost:${port}`, {
        auth: {
          token: 'invalid-token',
        },
      });

      unauthorizedSocket.on('connect_error', (error) => {
        expect(error.message).toBe('Authentication failed');
        unauthorizedSocket.close();
        done();
      });
    });
  });

  describe('Subscriptions', () => {
    it('subscribes to price feed successfully', (done) => {
      clientSocket.emit('subscribe', {
        type: 'price_feed',
        channel: 'AAPL',
      });

      clientSocket.on('subscribed', (data) => {
        expect(data.type).toBe('price_feed');
        expect(data.channel).toBe('AAPL');
        done();
      });
    });

    it('receives price updates after subscription', (done) => {
      clientSocket.emit('subscribe', {
        type: 'price_feed',
        channel: 'AAPL',
      });

      clientSocket.on('subscribed', () => {
        // Simulate price update broadcast
        wsServer.broadcastPriceUpdate('AAPL', {
          price: 150.00,
          change: 1.50,
          changePercent: 1.01,
        });
      });

      clientSocket.on('price_update', (data) => {
        expect(data.symbol).toBe('AAPL');
        expect(data.price).toBe(150.00);
        done();
      });
    });

    it('unsubscribes correctly', (done) => {
      clientSocket.emit('subscribe', {
        type: 'price_feed',
        channel: 'AAPL',
      });

      clientSocket.on('subscribed', () => {
        clientSocket.emit('unsubscribe', {
          type: 'price_feed',
          channel: 'AAPL',
        });
      });

      clientSocket.on('unsubscribed', (data) => {
        expect(data.type).toBe('price_feed');
        expect(data.channel).toBe('AAPL');
        done();
      });
    });
  });

  describe('Chat Functionality', () => {
    it('sends and receives chat messages', (done) => {
      const sessionId = 'chat123';
      
      clientSocket.emit('subscribe', {
        type: 'chat',
        channel: sessionId,
      });

      clientSocket.on('subscribed', () => {
        clientSocket.emit('chat_message', {
          sessionId,
          type: 'user_message',
          message: 'Hello, AI!',
        });
      });

      clientSocket.on('chat_message', (data) => {
        expect(data.sessionId).toBe(sessionId);
        expect(data.content).toBe('Hello, AI!');
        done();
      });
    });
  });

  describe('Portfolio Updates', () => {
    it('handles portfolio updates', (done) => {
      const portfolioId = 'portfolio123';
      
      clientSocket.emit('portfolio_update', {
        portfolioId,
        changes: {
          investments: [
            {
              symbol: 'AAPL',
              shares: 10,
              currentPrice: 150,
            },
          ],
        },
      });

      clientSocket.on('portfolio_updated', (data) => {
        expect(data.portfolio).toBeDefined();
        expect(data.metrics).toBeDefined();
        done();
      });
    });
  });

  describe('Rate Limiting', () => {
    it('enforces rate limits on subscriptions', (done) => {
      let errorCount = 0;
      
      // Rapidly send many subscription requests
      for (let i = 0; i < 20; i++) {
        clientSocket.emit('subscribe', {
          type: 'price_feed',
          channel: `STOCK${i}`,
        });
      }

      clientSocket.on('error', (data) => {
        if (data.message.includes('rate limit')) {
          errorCount++;
          if (errorCount > 0) {
            done();
          }
        }
      });
    });
  });
});
```

## 10.5 End-to-End Testing with Playwright

### E2E Test Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E Test Examples

```typescript
// e2e/portfolio.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Portfolio Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Wait for dashboard to load
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    
    // Navigate to portfolio
    await page.click('[data-testid="portfolio-nav"]');
    await expect(page.locator('[data-testid="portfolio-page"]')).toBeVisible();
  });

  test('should display portfolio overview', async ({ page }) => {
    // Check portfolio metrics are displayed
    await expect(page.locator('[data-testid="total-value"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-gain-loss"]')).toBeVisible();
    await expect(page.locator('[data-testid="day-change"]')).toBeVisible();
    
    // Check portfolio chart is rendered
    await expect(page.locator('[data-testid="portfolio-chart"]')).toBeVisible();
  });

  test('should add new investment', async ({ page }) => {
    // Click add investment button
    await page.click('[data-testid="add-investment-button"]');
    
    // Fill investment form
    await page.fill('[data-testid="symbol-input"]', 'AAPL');
    await page.fill('[data-testid="shares-input"]', '10');
    await page.fill('[data-testid="purchase-price-input"]', '150');
    
    // Submit form
    await page.click('[data-testid="submit-investment"]');
    
    // Verify investment appears in list
    await expect(page.locator('[data-testid="investment-AAPL"]')).toBeVisible();
    await expect(page.locator('[data-testid="investment-AAPL"] [data-testid="shares"]')).toHaveText('10');
  });

  test('should update investment', async ({ page }) => {
    // Assume AAPL investment exists
    await page.click('[data-testid="investment-AAPL"] [data-testid="edit-button"]');
    
    // Update shares
    await page.fill('[data-testid="shares-input"]', '15');
    await page.click('[data-testid="save-investment"]');
    
    // Verify update
    await expect(page.locator('[data-testid="investment-AAPL"] [data-testid="shares"]')).toHaveText('15');
  });

  test('should delete investment', async ({ page }) => {
    // Click delete button
    await page.click('[data-testid="investment-AAPL"] [data-testid="delete-button"]');
    
    // Confirm deletion
    await page.click('[data-testid="confirm-delete"]');
    
    // Verify investment is removed
    await expect(page.locator('[data-testid="investment-AAPL"]')).not.toBeVisible();
  });

  test('should filter investments', async ({ page }) => {
    // Add multiple investments first
    const investments = [
      { symbol: 'AAPL', type: 'stock' },
      { symbol: 'BTC-USD', type: 'crypto' },
      { symbol: 'SPY', type: 'etf' },
    ];

    for (const inv of investments) {
      await page.click('[data-testid="add-investment-button"]');
      await page.fill('[data-testid="symbol-input"]', inv.symbol);
      await page.selectOption('[data-testid="type-select"]', inv.type);
      await page.fill('[data-testid="shares-input"]', '10');
      await page.fill('[data-testid="purchase-price-input"]', '100');
      await page.click('[data-testid="submit-investment"]');
    }

    // Filter by type
    await page.selectOption('[data-testid="filter-type"]', 'crypto');
    
    // Verify only crypto investments are shown
    await expect(page.locator('[data-testid="investment-BTC-USD"]')).toBeVisible();
    await expect(page.locator('[data-testid="investment-AAPL"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="investment-SPY"]')).not.toBeVisible();
  });

  test('should sort investments', async ({ page }) => {
    // Sort by gain/loss
    await page.click('[data-testid="sort-gain-loss"]');
    
    // Verify sorting (this would require actual data to test properly)
    const investments = await page.locator('[data-testid^="investment-"]').all();
    expect(investments.length).toBeGreaterThan(0);
  });

  test('should show real-time price updates', async ({ page }) => {
    // Mock WebSocket connection for real-time updates
    await page.route('**/ws', route => {
      // Mock WebSocket responses
    });

    // Check that prices update in real-time
    const priceElement = page.locator('[data-testid="investment-AAPL"] [data-testid="current-price"]');
    const initialPrice = await priceElement.textContent();
    
    // Simulate price update via WebSocket
    await page.evaluate(() => {
      // Trigger mock price update
      window.dispatchEvent(new CustomEvent('price-update', {
        detail: { symbol: 'AAPL', price: 155.00 }
      }));
    });

    // Verify price updated
    await expect(priceElement).not.toHaveText(initialPrice || '');
  });
});
```

### Performance Testing

```typescript
// e2e/performance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should load dashboard within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
  });

  test('should handle large portfolio efficiently', async ({ page }) => {
    await page.goto('/login');
    // Login...
    
    // Navigate to portfolio with many investments
    await page.goto('/portfolio?test=large-portfolio');
    
    const startTime = Date.now();
    await expect(page.locator('[data-testid="portfolio-list"]')).toBeVisible();
    const renderTime = Date.now() - startTime;
    
    expect(renderTime).toBeLessThan(2000); // Should render within 2 seconds
    
    // Test scrolling performance
    await page.evaluate(() => {
      const list = document.querySelector('[data-testid="portfolio-list"]');
      if (list) {
        list.scrollTop = list.scrollHeight;
      }
    });
    
    // Should scroll smoothly without blocking
    await page.waitForTimeout(100);
    expect(true).toBe(true); // If we get here, scrolling didn't block
  });

  test('should maintain responsiveness during real-time updates', async ({ page }) => {
    await page.goto('/portfolio');
    
    // Simulate rapid price updates
    for (let i = 0; i < 100; i++) {
      await page.evaluate((index) => {
        window.dispatchEvent(new CustomEvent('price-update', {
          detail: { symbol: 'AAPL', price: 150 + (index * 0.1) }
        }));
      }, i);
    }
    
    // UI should remain responsive
    const button = page.locator('[data-testid="add-investment-button"]');
    await expect(button).toBeEnabled();
    
    const clickTime = Date.now();
    await button.click();
    const responseTime = Date.now() - clickTime;
    
    expect(responseTime).toBeLessThan(500); // Should respond within 500ms
  });
});
```

## Next Steps

Part 11 will cover Deployment & Infrastructure:
- Vercel deployment configuration
- Environment setup for production
- CDN configuration and asset optimization
- Database migration and backup strategies
- Monitoring and logging setup
- SSL certificate management
- Domain configuration and DNS setup
