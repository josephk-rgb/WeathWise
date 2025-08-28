# Part 7: Frontend Implementation

## 7.1 React Component Architecture

### Component Organization Strategy

```
src/components/
├── Core/                   # Core application components
│   ├── App.tsx
│   ├── Router.tsx
│   └── ErrorBoundary.tsx
├── Layout/                 # Layout and navigation
│   ├── Layout.tsx
│   ├── Navbar.tsx
│   ├── Sidebar.tsx
│   └── Footer.tsx
├── UI/                     # Reusable UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Modal.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Loading.tsx
│   └── index.ts
├── Charts/                 # Data visualization components
│   ├── LineChart.tsx
│   ├── PieChart.tsx
│   ├── BarChart.tsx
│   ├── AreaChart.tsx
│   └── ChartContainer.tsx
├── Dashboard/              # Dashboard-specific components
│   ├── DashboardGrid.tsx
│   ├── PortfolioSummary.tsx
│   ├── PerformanceChart.tsx
│   ├── RecentActivity.tsx
│   └── QuickActions.tsx
├── Portfolio/              # Portfolio management
│   ├── InvestmentList.tsx
│   ├── InvestmentCard.tsx
│   ├── AddInvestmentForm.tsx
│   ├── PortfolioMetrics.tsx
│   └── AssetAllocation.tsx
├── Chat/                   # AI chat interface
│   ├── ChatWidget.tsx
│   ├── MessageList.tsx
│   ├── MessageInput.tsx
│   ├── QuickActions.tsx
│   └── ChatProvider.tsx
├── Forms/                  # Form components
│   ├── FormField.tsx
│   ├── FormValidation.tsx
│   └── FormProvider.tsx
└── Features/               # Feature-specific components
    ├── Transactions/
    ├── Goals/
    ├── Budget/
    └── Analytics/
```

### Core Component System

```tsx
// src/components/UI/Button.tsx
import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    children,
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    disabled,
    ...props
  }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm focus:ring-blue-500',
      secondary: 'bg-gray-600 hover:bg-gray-700 text-white shadow-sm focus:ring-gray-500',
      outline: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200',
      ghost: 'hover:bg-gray-100 text-gray-700 focus:ring-gray-500 dark:hover:bg-gray-800 dark:text-gray-200',
      destructive: 'bg-red-600 hover:bg-red-700 text-white shadow-sm focus:ring-red-500'
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm rounded-md gap-1.5',
      md: 'px-4 py-2 text-sm rounded-md gap-2',
      lg: 'px-6 py-3 text-base rounded-lg gap-2',
      xl: 'px-8 py-4 text-lg rounded-lg gap-3'
    };

    const classes = clsx(
      baseStyles,
      variants[variant],
      sizes[size],
      fullWidth && 'w-full',
      className
    );

    const renderIcon = (position: 'left' | 'right') => {
      if (loading && position === 'left') {
        return <Loader2 className="w-4 h-4 animate-spin" />;
      }
      if (icon && iconPosition === position) {
        return icon;
      }
      return null;
    };

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {renderIcon('left')}
        {children}
        {renderIcon('right')}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
```

```tsx
// src/components/UI/Card.tsx
import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'bordered' | 'elevated' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  clickable?: boolean;
  loading?: boolean;
  error?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  padding = 'md',
  clickable = false,
  loading = false,
  error = false
}) => {
  const baseStyles = 'bg-white dark:bg-gray-800 rounded-xl transition-all duration-200';
  
  const variants = {
    default: 'border border-gray-200 dark:border-gray-700',
    bordered: 'border-2 border-gray-300 dark:border-gray-600',
    elevated: 'shadow-lg border border-gray-100 dark:border-gray-700',
    glass: 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/20 dark:border-gray-700/50'
  };

  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8'
  };

  const interactionStyles = clickable ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : '';
  const loadingStyles = loading ? 'animate-pulse' : '';
  const errorStyles = error ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' : '';

  const classes = clsx(
    baseStyles,
    variants[variant],
    paddings[padding],
    interactionStyles,
    loadingStyles,
    errorStyles,
    className
  );

  if (loading) {
    return (
      <div className={classes}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
          <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={classes}>
      {children}
    </div>
  );
};

export default Card;
```

### Advanced Chart Components

```tsx
// src/components/Charts/ChartContainer.tsx
import React, { useMemo } from 'react';
import { ResponsiveContainer } from 'recharts';
import { useTheme } from '../hooks/useTheme';
import Card from '../UI/Card';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  loading?: boolean;
  error?: string;
  height?: number;
  showTrend?: boolean;
  trendValue?: number;
  trendLabel?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  subtitle,
  children,
  loading = false,
  error,
  height = 300,
  showTrend = false,
  trendValue,
  trendLabel,
  actions,
  className
}) => {
  const { theme } = useTheme();
  
  const trendIcon = useMemo(() => {
    if (!showTrend || trendValue === undefined) return null;
    
    const isPositive = trendValue >= 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
    
    return (
      <div className={`flex items-center gap-1 ${colorClass}`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">
          {isPositive ? '+' : ''}{trendValue.toFixed(2)}%
        </span>
        {trendLabel && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {trendLabel}
          </span>
        )}
      </div>
    );
  }, [showTrend, trendValue, trendLabel]);

  if (error) {
    return (
      <Card className={className} error>
        <div className="text-center py-8">
          <div className="text-red-600 dark:text-red-400 mb-2">
            Chart Error
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {trendIcon}
          {actions}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center" style={{ height }}>
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          {children}
        </ResponsiveContainer>
      )}
    </Card>
  );
};
```

```tsx
// src/components/Charts/PortfolioPerformanceChart.tsx
import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  AreaChart
} from 'recharts';
import { ChartContainer } from './ChartContainer';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import Button from '../UI/Button';

interface PerformanceDataPoint {
  date: string;
  portfolioValue: number;
  benchmark: number;
  cashFlow: number;
}

interface PortfolioPerformanceChartProps {
  data: PerformanceDataPoint[];
  loading?: boolean;
  error?: string;
  currency?: string;
  height?: number;
}

export const PortfolioPerformanceChart: React.FC<PortfolioPerformanceChartProps> = ({
  data,
  loading = false,
  error,
  currency = 'USD',
  height = 400
}) => {
  const [viewMode, setViewMode] = useState<'value' | 'returns'>('value');
  const [showBenchmark, setShowBenchmark] = useState(true);
  const [showCashFlow, setShowCashFlow] = useState(false);

  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const firstValue = data[0]?.portfolioValue || 1;
    const firstBenchmark = data[0]?.benchmark || 1;

    return data.map((point, index) => {
      const portfolioReturn = ((point.portfolioValue - firstValue) / firstValue) * 100;
      const benchmarkReturn = ((point.benchmark - firstBenchmark) / firstBenchmark) * 100;

      return {
        ...point,
        date: formatDate(new Date(point.date), 'MMM dd'),
        portfolioReturn,
        benchmarkReturn,
        formattedValue: formatCurrency(point.portfolioValue, currency),
        formattedBenchmark: formatCurrency(point.benchmark, currency)
      };
    });
  }, [data, currency]);

  const latestData = processedData[processedData.length - 1];
  const totalReturn = latestData ? latestData.portfolioReturn : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600 dark:text-gray-400">{entry.name}:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {viewMode === 'value' 
                  ? formatCurrency(entry.value, currency)
                  : `${entry.value.toFixed(2)}%`
                }
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const chartActions = (
    <div className="flex items-center gap-2">
      <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        <Button
          size="sm"
          variant={viewMode === 'value' ? 'primary' : 'ghost'}
          onClick={() => setViewMode('value')}
          className="text-xs px-3 py-1"
        >
          Value
        </Button>
        <Button
          size="sm"
          variant={viewMode === 'returns' ? 'primary' : 'ghost'}
          onClick={() => setViewMode('returns')}
          className="text-xs px-3 py-1"
        >
          Returns
        </Button>
      </div>
      
      <Button
        size="sm"
        variant={showBenchmark ? 'primary' : 'outline'}
        onClick={() => setShowBenchmark(!showBenchmark)}
        className="text-xs"
      >
        Benchmark
      </Button>
    </div>
  );

  return (
    <ChartContainer
      title="Portfolio Performance"
      subtitle={`Total return: ${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`}
      loading={loading}
      error={error}
      height={height}
      showTrend
      trendValue={totalReturn}
      trendLabel="since inception"
      actions={chartActions}
    >
      {viewMode === 'value' ? (
        <AreaChart data={processedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={12}
            tickFormatter={(value) => formatCurrency(value, currency, { compact: true })}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          <Area
            type="monotone"
            dataKey="portfolioValue"
            name="Portfolio"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.1}
            strokeWidth={3}
          />
          
          {showBenchmark && (
            <Area
              type="monotone"
              dataKey="benchmark"
              name="S&P 500"
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.05}
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          )}
        </AreaChart>
      ) : (
        <LineChart data={processedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={12}
            tickFormatter={(value) => `${value.toFixed(1)}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          <Line
            type="monotone"
            dataKey="portfolioReturn"
            name="Portfolio Return"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={false}
          />
          
          {showBenchmark && (
            <Line
              type="monotone"
              dataKey="benchmarkReturn"
              name="Benchmark Return"
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          )}
        </LineChart>
      )}
    </ChartContainer>
  );
};
```

## 7.2 State Management with Zustand

### Global Store Architecture

```typescript
// src/store/types.ts
export interface User {
  id: string;
  email: string;
  profile: UserProfile;
  preferences: UserPreferences;
  riskProfile: RiskProfile;
  subscription: Subscription;
}

export interface Investment {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  purchasePrice: number;
  currentPrice: number;
  type: InvestmentType;
  purchaseDate: Date;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
}

export interface Portfolio {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dayChange: number;
  dayChangePercent: number;
  investments: Investment[];
  assetAllocation: AssetAllocation[];
  performance: PerformanceMetrics;
}

export interface AppState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  
  // Portfolio state
  portfolio: Portfolio | null;
  investments: Investment[];
  
  // Market data
  marketData: Record<string, MarketData>;
  
  // UI state
  theme: 'light' | 'dark' | 'auto';
  sidebarOpen: boolean;
  notifications: Notification[];
  
  // Loading states
  loading: {
    user: boolean;
    portfolio: boolean;
    investments: boolean;
    marketData: boolean;
  };
  
  // Error states
  errors: {
    user: string | null;
    portfolio: string | null;
    investments: string | null;
    marketData: string | null;
  };
}
```

```typescript
// src/store/useStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { AppState, User, Investment, Portfolio } from './types';
import { userSlice } from './slices/userSlice';
import { portfolioSlice } from './slices/portfolioSlice';
import { marketDataSlice } from './slices/marketDataSlice';
import { uiSlice } from './slices/uiSlice';

type StoreState = AppState & {
  // User actions
  setUser: (user: User | null) => void;
  updateUserProfile: (profile: Partial<User['profile']>) => void;
  updateUserPreferences: (preferences: Partial<User['preferences']>) => void;
  setAuthenticated: (authenticated: boolean) => void;
  
  // Portfolio actions
  setPortfolio: (portfolio: Portfolio | null) => void;
  setInvestments: (investments: Investment[]) => void;
  addInvestment: (investment: Investment) => void;
  updateInvestment: (id: string, updates: Partial<Investment>) => void;
  removeInvestment: (id: string) => void;
  
  // Market data actions
  setMarketData: (symbol: string, data: MarketData) => void;
  updateMarketPrices: (prices: Record<string, number>) => void;
  
  // UI actions
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  setSidebarOpen: (open: boolean) => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  
  // Loading actions
  setLoading: (key: keyof AppState['loading'], loading: boolean) => void;
  
  // Error actions
  setError: (key: keyof AppState['errors'], error: string | null) => void;
  clearErrors: () => void;
  
  // Computed values
  totalInvestmentValue: () => number;
  portfolioAllocation: () => AssetAllocation[];
  topPerformers: () => Investment[];
  worstPerformers: () => Investment[];
};

export const useStore = create<StoreState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        portfolio: null,
        investments: [],
        marketData: {},
        theme: 'auto',
        sidebarOpen: true,
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

        // User actions
        ...userSlice(set, get),
        
        // Portfolio actions
        ...portfolioSlice(set, get),
        
        // Market data actions
        ...marketDataSlice(set, get),
        
        // UI actions
        ...uiSlice(set, get),

        // Loading actions
        setLoading: (key, loading) => set((state) => ({
          loading: { ...state.loading, [key]: loading }
        })),

        // Error actions
        setError: (key, error) => set((state) => ({
          errors: { ...state.errors, [key]: error }
        })),
        
        clearErrors: () => set({
          errors: {
            user: null,
            portfolio: null,
            investments: null,
            marketData: null,
          }
        }),

        // Computed values
        totalInvestmentValue: () => {
          const { investments } = get();
          return investments.reduce((total, inv) => total + inv.marketValue, 0);
        },

        portfolioAllocation: () => {
          const { investments } = get();
          const totalValue = investments.reduce((total, inv) => total + inv.marketValue, 0);
          
          const allocation = investments.reduce((acc, inv) => {
            const existing = acc.find(item => item.type === inv.type);
            if (existing) {
              existing.value += inv.marketValue;
              existing.percentage = (existing.value / totalValue) * 100;
            } else {
              acc.push({
                type: inv.type,
                value: inv.marketValue,
                percentage: (inv.marketValue / totalValue) * 100,
                count: 1
              });
            }
            return acc;
          }, [] as AssetAllocation[]);

          return allocation.sort((a, b) => b.value - a.value);
        },

        topPerformers: () => {
          const { investments } = get();
          return [...investments]
            .sort((a, b) => b.gainLossPercent - a.gainLossPercent)
            .slice(0, 5);
        },

        worstPerformers: () => {
          const { investments } = get();
          return [...investments]
            .sort((a, b) => a.gainLossPercent - b.gainLossPercent)
            .slice(0, 5);
        },
      }),
      {
        name: 'wealthwise-store',
        partialize: (state) => ({
          user: state.user,
          theme: state.theme,
          sidebarOpen: state.sidebarOpen,
        }),
      }
    ),
    {
      name: 'WealthWise Store',
    }
  )
);
```

```typescript
// src/store/slices/portfolioSlice.ts
import { StateCreator } from 'zustand';
import { AppState, Investment, Portfolio } from '../types';

export interface PortfolioSlice {
  setPortfolio: (portfolio: Portfolio | null) => void;
  setInvestments: (investments: Investment[]) => void;
  addInvestment: (investment: Investment) => void;
  updateInvestment: (id: string, updates: Partial<Investment>) => void;
  removeInvestment: (id: string) => void;
  updateInvestmentPrices: (priceUpdates: Record<string, number>) => void;
  recalculatePortfolio: () => void;
}

export const portfolioSlice: StateCreator<
  AppState & PortfolioSlice,
  [],
  [],
  PortfolioSlice
> = (set, get) => ({
  setPortfolio: (portfolio) => set({ portfolio }),
  
  setInvestments: (investments) => {
    set({ investments });
    get().recalculatePortfolio();
  },
  
  addInvestment: (investment) => {
    const { investments } = get();
    const newInvestments = [...investments, investment];
    set({ investments: newInvestments });
    get().recalculatePortfolio();
  },
  
  updateInvestment: (id, updates) => {
    const { investments } = get();
    const newInvestments = investments.map(inv => 
      inv.id === id ? { ...inv, ...updates } : inv
    );
    set({ investments: newInvestments });
    get().recalculatePortfolio();
  },
  
  removeInvestment: (id) => {
    const { investments } = get();
    const newInvestments = investments.filter(inv => inv.id !== id);
    set({ investments: newInvestments });
    get().recalculatePortfolio();
  },
  
  updateInvestmentPrices: (priceUpdates) => {
    const { investments } = get();
    const newInvestments = investments.map(inv => {
      const newPrice = priceUpdates[inv.symbol];
      if (newPrice && newPrice !== inv.currentPrice) {
        const marketValue = inv.shares * newPrice;
        const gainLoss = marketValue - (inv.shares * inv.purchasePrice);
        const gainLossPercent = ((newPrice - inv.purchasePrice) / inv.purchasePrice) * 100;
        
        return {
          ...inv,
          currentPrice: newPrice,
          marketValue,
          gainLoss,
          gainLossPercent
        };
      }
      return inv;
    });
    
    set({ investments: newInvestments });
    get().recalculatePortfolio();
  },
  
  recalculatePortfolio: () => {
    const { investments } = get();
    
    if (investments.length === 0) {
      set({ portfolio: null });
      return;
    }
    
    const totalValue = investments.reduce((sum, inv) => sum + inv.marketValue, 0);
    const totalCost = investments.reduce((sum, inv) => sum + (inv.shares * inv.purchasePrice), 0);
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
    
    // Calculate day change (this would come from real-time price data)
    const dayChange = investments.reduce((sum, inv) => {
      // Placeholder calculation - in reality, you'd use previous day's closing price
      const prevPrice = inv.currentPrice * 0.99; // Assume 1% change for demo
      const dayGainLoss = (inv.currentPrice - prevPrice) * inv.shares;
      return sum + dayGainLoss;
    }, 0);
    
    const dayChangePercent = totalValue > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0;
    
    const portfolio: Portfolio = {
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
      dayChange,
      dayChangePercent,
      investments,
      assetAllocation: get().portfolioAllocation(),
      performance: {
        oneDay: dayChangePercent,
        oneWeek: 0, // Would be calculated from historical data
        oneMonth: 0,
        threeMonth: 0,
        sixMonth: 0,
        oneYear: 0,
        inception: totalGainLossPercent
      }
    };
    
    set({ portfolio });
  },
});
```

## 7.3 Real-time Updates with WebSockets

### WebSocket Integration

```typescript
// src/services/websocketService.ts
import { useStore } from '../store/useStore';
import { MarketData, PriceUpdate, PortfolioUpdate } from '../types';

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private subscriptions = new Set<string>();

  constructor(private url: string) {
    this.connect();
  }

  private connect(): void {
    try {
      this.ws = new WebSocket(this.url);
      this.setupEventListeners();
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.handleReconnect();
    }
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.resubscribe();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      this.stopHeartbeat();
      if (!event.wasClean) {
        this.handleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private handleMessage(data: any): void {
    const { setMarketData, updateInvestmentPrices, addNotification } = useStore.getState();

    switch (data.type) {
      case 'price_update':
        this.handlePriceUpdate(data.payload);
        break;
        
      case 'portfolio_update':
        this.handlePortfolioUpdate(data.payload);
        break;
        
      case 'market_alert':
        this.handleMarketAlert(data.payload);
        break;
        
      case 'recommendation':
        this.handleNewRecommendation(data.payload);
        break;
        
      case 'heartbeat':
        this.sendHeartbeat();
        break;
        
      default:
        console.warn('Unknown message type:', data.type);
    }
  }

  private handlePriceUpdate(payload: PriceUpdate): void {
    const { updateInvestmentPrices, setMarketData } = useStore.getState();
    
    // Update market data
    setMarketData(payload.symbol, {
      symbol: payload.symbol,
      currentPrice: payload.price,
      change: payload.change,
      changePercent: payload.changePercent,
      volume: payload.volume || 0,
      lastUpdated: new Date(payload.timestamp)
    });

    // Update investment prices if the symbol is in the portfolio
    updateInvestmentPrices({ [payload.symbol]: payload.price });
  }

  private handlePortfolioUpdate(payload: PortfolioUpdate): void {
    const { addNotification } = useStore.getState();
    
    // Show notification for significant portfolio changes
    if (Math.abs(payload.dayChangePercent) > 5) {
      addNotification({
        id: Date.now().toString(),
        type: payload.dayChangePercent > 0 ? 'success' : 'warning',
        title: 'Portfolio Update',
        message: `Your portfolio is ${payload.dayChangePercent > 0 ? 'up' : 'down'} ${Math.abs(payload.dayChangePercent).toFixed(2)}% today`,
        timestamp: new Date(),
        autoClose: true
      });
    }
  }

  private handleMarketAlert(payload: any): void {
    const { addNotification } = useStore.getState();
    
    addNotification({
      id: Date.now().toString(),
      type: payload.severity === 'high' ? 'error' : 'info',
      title: 'Market Alert',
      message: payload.message,
      timestamp: new Date(),
      autoClose: payload.severity !== 'high'
    });
  }

  private handleNewRecommendation(payload: any): void {
    const { addNotification } = useStore.getState();
    
    addNotification({
      id: Date.now().toString(),
      type: 'info',
      title: 'New Recommendation',
      message: `New ${payload.type} recommendation available`,
      timestamp: new Date(),
      autoClose: true,
      action: {
        label: 'View',
        onClick: () => {
          // Navigate to recommendations page
          window.location.href = '/recommendations';
        }
      }
    });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000); // Send heartbeat every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private sendHeartbeat(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'heartbeat' }));
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
      const { addNotification } = useStore.getState();
      addNotification({
        id: Date.now().toString(),
        type: 'error',
        title: 'Connection Lost',
        message: 'Unable to connect to real-time data. Please refresh the page.',
        timestamp: new Date(),
        autoClose: false
      });
    }
  }

  private resubscribe(): void {
    this.subscriptions.forEach(subscription => {
      this.send({ type: 'subscribe', payload: subscription });
    });
  }

  public subscribe(channel: string): void {
    this.subscriptions.add(channel);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'subscribe', payload: channel });
    }
  }

  public unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'unsubscribe', payload: channel });
    }
  }

  public send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  public disconnect(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }
}

// React hook for WebSocket integration
export const useWebSocket = () => {
  const [wsService, setWsService] = React.useState<WebSocketService | null>(null);
  const { user, investments } = useStore();

  React.useEffect(() => {
    if (user && process.env.VITE_WS_URL) {
      const service = new WebSocketService(process.env.VITE_WS_URL);
      setWsService(service);

      return () => {
        service.disconnect();
      };
    }
  }, [user]);

  React.useEffect(() => {
    if (wsService && investments.length > 0) {
      // Subscribe to price updates for user's investments
      const symbols = investments.map(inv => inv.symbol);
      symbols.forEach(symbol => {
        wsService.subscribe(`prices:${symbol}`);
      });

      // Subscribe to portfolio updates
      wsService.subscribe(`portfolio:${user?.id}`);

      return () => {
        symbols.forEach(symbol => {
          wsService.unsubscribe(`prices:${symbol}`);
        });
        wsService.unsubscribe(`portfolio:${user?.id}`);
      };
    }
  }, [wsService, investments, user]);

  return wsService;
};
```

### Real-time Price Display Component

```tsx
// src/components/Portfolio/RealTimePriceDisplay.tsx
import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCurrency } from '../../utils/currency';
import { clsx } from 'clsx';

interface RealTimePriceDisplayProps {
  symbol: string;
  className?: string;
  showChange?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const RealTimePriceDisplay: React.FC<RealTimePriceDisplayProps> = ({
  symbol,
  className,
  showChange = true,
  size = 'md'
}) => {
  const { marketData } = useStore();
  const [priceAnimation, setPriceAnimation] = useState<'up' | 'down' | null>(null);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);

  const currentData = marketData[symbol];
  const currentPrice = currentData?.currentPrice || 0;
  const change = currentData?.change || 0;
  const changePercent = currentData?.changePercent || 0;

  // Animate price changes
  useEffect(() => {
    if (prevPrice !== null && currentPrice !== prevPrice) {
      const direction = currentPrice > prevPrice ? 'up' : 'down';
      setPriceAnimation(direction);
      
      const timer = setTimeout(() => {
        setPriceAnimation(null);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
    setPrevPrice(currentPrice);
  }, [currentPrice, prevPrice]);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const getChangeColor = () => {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getChangeIcon = () => {
    if (change > 0) return <TrendingUp className="w-4 h-4" />;
    if (change < 0) return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const priceClass = clsx(
    'font-semibold transition-all duration-300',
    sizeClasses[size],
    priceAnimation === 'up' && 'text-green-600 scale-105',
    priceAnimation === 'down' && 'text-red-600 scale-105',
    !priceAnimation && 'text-gray-900 dark:text-gray-100'
  );

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <span className={priceClass}>
        {formatCurrency(currentPrice)}
      </span>
      
      {showChange && currentData && (
        <div className={clsx('flex items-center gap-1', getChangeColor())}>
          {getChangeIcon()}
          <span className="text-sm font-medium">
            {change >= 0 ? '+' : ''}{formatCurrency(change)}
          </span>
          <span className="text-xs">
            ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
          </span>
        </div>
      )}
      
      {!currentData && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Price unavailable
        </span>
      )}
    </div>
  );
};
```

## Next Steps

Part 8 will cover Financial Data Integration:
- Market data APIs integration (Yahoo Finance, Alpha Vantage)
- Real-time price feeds and data processing
- Historical data management and caching
- Economic indicators and news sentiment
- Data validation and error handling
- Performance optimization for large datasets
