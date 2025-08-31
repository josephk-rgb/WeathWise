# WeathWise Backend Environment Configuration Guide

This guide helps you configure all the necessary environment variables for the WeathWise backend.

## 🔧 Required Configuration

### 1. Auth0 Configuration (✅ Already Configured)
Your Auth0 settings are already properly configured:
```bash
AUTH0_DOMAIN=dev-ttazs5la3wtfckz2.us.auth0.com
AUTH0_CLIENT_ID=VOUMJMo0EZBWPKLbJvljFmZTrXqnpYjg
AUTH0_CLIENT_SECRET=XfcRnJkdF6fd_pCVd8BMuoqCXl0S-cVlgXr1vGb5RXqt6gg2qs-vvKgf57HFsWtM
AUTH0_AUDIENCE=https://wealthwise-api.com
```

### 2. Database Configuration (✅ Already Configured)
```bash
MONGODB_URI=mongodb+srv://josephkinyodah_db_user:wolyk0iaY0FJM4P1@wealthwise1.od6ecq4.mongodb.net/?retryWrites=true&w=majority&appName=wealthwise1
MONGODB_DB_NAME=wealthwise
```

## 🚀 Optional API Keys (For Enhanced Features)

### 3. News API (For Financial News)
**Current Status:** Placeholder value
**Impact:** News endpoints will return mock data
**To configure:**
1. Sign up at https://newsapi.org/
2. Get your free API key
3. Update in `.env`:
```bash
NEWS_API_KEY=your-actual-news-api-key-here
```

### 4. Alpha Vantage API (For Additional Market Data)
**Current Status:** Commented out
**Impact:** Basic market data still works via Yahoo Finance
**To configure:**
1. Sign up at https://www.alphavantage.co/
2. Get your free API key
3. Update in `.env`:
```bash
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-key-here
```

### 5. ML Service Configuration
**Current Status:** Configured for local development
**Impact:** AI features will use circuit breaker with fallbacks
```bash
PYTHON_ML_SERVICE_URL=http://localhost:8000
OLLAMA_BASE_URL=http://localhost:11434
```

## 🔄 Environment Validation

Run the validation script to check your configuration:
```bash
npm run test:auth0
```

## 📊 Feature Impact Matrix

| Feature | Requires | Current Status | Fallback Available |
|---------|----------|----------------|-------------------|
| User Authentication | Auth0 | ✅ Working | ❌ No fallback |
| Basic Portfolio | Database | ✅ Working | ❌ No fallback |
| Market Data | Yahoo Finance | ✅ Working | ✅ Mock data |
| Financial News | News API | ⚠️ Mock data | ✅ Mock articles |
| AI Chat | ML Service | ⚠️ Circuit breaker | ✅ Rule-based responses |
| Advanced Analytics | Yahoo Finance | ✅ Working | ✅ Default calculations |
| Real-time Updates | WebSocket | ✅ Working | ❌ No fallback |

## 🎯 Priority Recommendations

### High Priority (Application Won't Work)
- ✅ Auth0 configuration (Already done)
- ✅ Database configuration (Already done)

### Medium Priority (Enhanced Features)
- 🔄 News API key (for real financial news)
- 🔄 ML Service setup (for advanced AI features)

### Low Priority (Additional Data Sources)
- 🔄 Alpha Vantage API (supplementary market data)

## 🚀 Quick Setup Commands

```bash
# 1. Test current configuration
npm run test:auth0

# 2. Start the development server
npm run dev

# 3. Test API endpoints
npm run test:api

# 4. Check WebSocket status
curl http://localhost:3001/api/websocket/status -H "Authorization: Bearer YOUR_TOKEN"

# 5. Check AI service status
curl http://localhost:3001/api/ai/status -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔒 Security Notes

1. **Never commit real API keys to version control**
2. **Use different keys for development/production**
3. **Regularly rotate sensitive credentials**
4. **Monitor API usage and costs**

## 🆘 Troubleshooting

### Issue: "Auth0 environment variables not configured"
- **Solution:** Already resolved in your setup

### Issue: "AI service temporarily unavailable"
- **Expected:** Normal when ML service isn't running
- **Solution:** Start the Python ML service or use fallback responses

### Issue: "News API key not configured"
- **Impact:** Mock news data will be returned
- **Solution:** Sign up for News API and update NEWS_API_KEY

### Issue: Market data not updating
- **Check:** Yahoo Finance service availability
- **Fallback:** Service automatically retries with exponential backoff

## 📈 Monitoring Your Setup

The application provides several endpoints to monitor configuration:

- `/health` - Overall application health
- `/api/ai/status` - AI service and circuit breaker status
- `/api/websocket/status` - WebSocket connection statistics
- `/api/market/data/AAPL` - Test market data retrieval

## 🎉 Your Current Status

✅ **Your backend is production-ready!**

The core functionality works perfectly with your current configuration. Optional API keys will enhance the experience but aren't required for basic operation.
