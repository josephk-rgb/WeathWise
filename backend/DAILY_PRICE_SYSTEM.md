# Daily Price System Documentation

## Overview

The Daily Price System is a comprehensive solution for storing, managing, and retrieving historical stock prices for portfolio performance calculations. It replaces the previous approach of fetching historical data from external APIs on every request with a local database storage system.

## Key Features

- **Daily Price Storage**: Stores OHLCV data for all investment symbols
- **Automatic Updates**: End-of-day cron job updates prices automatically
- **Historical Data**: Backfills historical data for existing investments
- **Portfolio Performance**: Calculates accurate portfolio history from purchase dates
- **Admin Tools**: Manual triggers and monitoring endpoints

## Architecture

### Database Schema

```javascript
// DailyPrice Model
{
  symbol: String,        // Stock symbol (e.g., "AAPL")
  date: Date,           // Trading date
  open: Number,         // Opening price
  high: Number,         // High price
  low: Number,          // Low price
  close: Number,        // Closing price
  volume: Number,       // Trading volume
  adjustedClose: Number, // Adjusted closing price (optional)
  source: String,       // Data source ("yahoo_finance")
  createdAt: Date,      // Record creation timestamp
  updatedAt: Date       // Record update timestamp
}
```

### Services

1. **DailyPriceService**: Core service for price data management
2. **CronService**: Handles scheduled tasks
3. **MarketDataService**: Fetches data from external APIs

## Usage

### Automatic Operation

The system runs automatically with these scheduled tasks:

- **Daily Price Update**: 4:30 PM EST, Monday-Friday
- **Weekly Cleanup**: 2:00 AM EST, Sundays
- **Health Check**: Every hour

### Manual Operations

#### Admin Endpoints

```bash
# Update prices manually
POST /api/admin/update-prices

# Populate historical data
POST /api/admin/populate-historical
Body: { "days": 365 }

# Get cron service status
GET /api/admin/cron-status

# Get price statistics
GET /api/admin/price-stats

# Clean up old data
POST /api/admin/cleanup-prices
Body: { "daysToKeep": 730 }
```

#### Scripts

```bash
# Populate historical data for existing investments
npx ts-node src/scripts/populateHistoricalData.ts

# Test the system
npx ts-node src/scripts/testDailyPriceSystem.ts
```

## Portfolio Performance Calculation

### How It Works

1. **Get Investments**: Fetch all active investments for the user
2. **Find Earliest Purchase**: Determine the earliest purchase date
3. **Get Historical Prices**: Retrieve stored daily prices for all symbols
4. **Calculate Daily Values**: For each day, calculate portfolio value using:
   - `shares × historical_close_price` for each investment
   - Fallback to purchase price if no historical data available
5. **Return Timeline**: Return array of `{date, value}` objects

### Example Timeline

```
Investment 1: AAPL purchased 2023-06-15 (100 shares @ $150)
Investment 2: MSFT purchased 2024-01-10 (50 shares @ $300)

Portfolio History:
- 2023-06-15: $15,000 (AAPL only)
- 2023-06-16: $15,100 (AAPL price change)
- ...
- 2024-01-10: $30,000 (AAPL + MSFT initial)
- 2024-01-11: $30,200 (both price changes)
- ...
- 2024-09-12: $51,507 (current value)
```

## Benefits

### Performance
- **Fast Loading**: No external API calls for historical data
- **Cached Data**: All historical data stored locally
- **Efficient Queries**: Optimized database indexes

### Accuracy
- **True Timeline**: Shows performance from actual purchase dates
- **Real Data**: Uses actual historical closing prices
- **Consistent**: Same calculation method across all components

### Reliability
- **Offline Capable**: Works without external API availability
- **Data Integrity**: Validates and stores data properly
- **Error Handling**: Robust error handling and fallbacks

## Setup Instructions

### 1. Initial Setup

```bash
# Install dependencies
npm install node-cron @types/node-cron

# Start the server (cron service starts automatically)
npm run dev
```

### 2. Populate Historical Data

```bash
# Run the migration script
npx ts-node src/scripts/populateHistoricalData.ts
```

### 3. Verify System

```bash
# Test the system
npx ts-node src/scripts/testDailyPriceSystem.ts
```

## Monitoring

### Logs

The system logs all operations:

```
[INFO] Starting daily price update...
[INFO] Updating prices for 5 symbols: AAPL, MSFT, GOOGL, TSLA, AMZN
[INFO] Updated price for AAPL: $234.56
[INFO] Daily price update completed. Success: 5, Errors: 0
```

### Health Checks

Monitor the system using admin endpoints:

```bash
# Check cron service status
curl http://localhost:3001/api/admin/cron-status

# Get price statistics
curl http://localhost:3001/api/admin/price-stats
```

## Troubleshooting

### Common Issues

1. **No Historical Data**
   - Run the migration script: `npx ts-node src/scripts/populateHistoricalData.ts`
   - Check if investments exist and are active

2. **Price Updates Failing**
   - Check Yahoo Finance API connectivity
   - Verify investment symbols are valid
   - Check server logs for specific errors

3. **Portfolio History Empty**
   - Ensure investments have valid purchase dates
   - Check if daily price data exists for the symbols
   - Verify the date range calculation

### Debug Commands

```bash
# Test price update for specific symbol
curl -X POST http://localhost:3001/api/admin/update-prices

# Check database records
curl http://localhost:3001/api/admin/price-stats

# Test portfolio calculation
npx ts-node src/scripts/testDailyPriceSystem.ts
```

## Future Enhancements

- **Real-time Updates**: WebSocket updates for live price changes
- **Multiple Data Sources**: Support for additional price data providers
- **Advanced Analytics**: Technical indicators and performance metrics
- **Data Export**: Export historical data for external analysis
- **Alert System**: Price alerts and notifications

## API Reference

### DailyPriceService Methods

```typescript
// Update all daily prices
updateDailyPrices(): Promise<void>

// Update price for specific symbol
updateSymbolPrice(symbol: string): Promise<void>

// Get historical prices
getHistoricalPrices(symbol: string, startDate: Date, endDate: Date): Promise<IDailyPrice[]>

// Get latest price
getLatestPrice(symbol: string): Promise<IDailyPrice | null>

// Calculate portfolio performance
calculatePortfolioHistoricalPerformance(investments: any[]): Promise<any[]>

// Populate historical data
populateHistoricalData(days: number): Promise<void>

// Clean old data
cleanOldPrices(daysToKeep: number): Promise<void>
```

### CronService Methods

```typescript
// Start cron jobs
start(): void

// Stop cron jobs
stop(): void

// Get status
getStatus(): { isRunning: boolean; activeJobs: number }

// Manual triggers
triggerDailyPriceUpdate(): Promise<void>
triggerHistoricalDataPopulation(days: number): Promise<void>
```
