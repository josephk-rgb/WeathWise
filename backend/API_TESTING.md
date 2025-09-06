# API Testing Guide

This guide covers how to test the WeathWise backend API endpoints using various tools.

## Prerequisites

1. **Start the Backend Server**
   ```bash
   cd backend
   npm run dev
   ```

2. **Set up Environment Variables**
   Copy `env.example` to `.env` and configure:
   ```bash
   cp env.example .env
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

## Testing Methods

### 1. Automated Test Script

Run the comprehensive test script:
```bash
npm run test:api
```

This script tests all endpoints with mock authentication.

### 2. Manual Testing with curl

#### Health Check
```bash
curl http://localhost:3001/health
```

#### Authentication Endpoints
```bash
# Get current user (requires valid JWT token)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3001/api/auth/me

# Update profile
curl -X PUT \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"firstName": "John", "lastName": "Doe"}' \
     http://localhost:3001/api/auth/profile

# Update preferences
curl -X PUT \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"currency": "USD", "timezone": "America/New_York"}' \
     http://localhost:3001/api/auth/preferences
```

#### Market Data Endpoints
```bash
# Get quote for a symbol
curl http://localhost:3001/api/market/data/AAPL

# Get multiple quotes
curl "http://localhost:3001/api/market/data?symbols=AAPL,GOOGL,MSFT"

# Search symbols
curl "http://localhost:3001/api/market/search?query=Apple&limit=5"

# Get market summary
curl http://localhost:3001/api/market/summary

# Get market news
curl "http://localhost:3001/api/market/news?query=stock%20market&limit=5"

# Get news for specific symbol
curl "http://localhost:3001/api/market/news/AAPL?limit=3"
```

#### Portfolio Endpoints
```bash
# Get portfolio (requires authentication)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3001/api/portfolio

# Get portfolio metrics
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3001/api/portfolio/metrics
```

#### Transaction Endpoints
```bash
# Get transactions (requires authentication)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3001/api/transactions

# Create transaction
curl -X POST \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "amount": -50.00,
       "description": "Grocery shopping",
       "category": "Food & Dining",
       "type": "expense",
       "date": "2024-01-15T10:00:00Z"
     }' \
     http://localhost:3001/api/transactions
```

#### Investment Endpoints
```bash
# Get investments (requires authentication)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3001/api/investments

# Create investment
curl -X POST \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "symbol": "AAPL",
       "name": "Apple Inc.",
       "shares": 10,
       "purchasePrice": 150.00,
       "type": "stock",
       "purchaseDate": "2024-01-01T00:00:00Z"
     }' \
     http://localhost:3001/api/investments
```

#### AI Endpoints
```bash
# Get recommendations (requires authentication)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3001/api/ai/recommendations

# Chat with AI
curl -X POST \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "message": "How should I invest $10,000?",
       "context": {"riskProfile": "moderate"}
     }' \
     http://localhost:3001/api/ai/chat
```

### 3. Testing with Postman

1. **Import the Collection**
   - Create a new collection in Postman
   - Import the endpoints from the curl commands above

2. **Set up Environment Variables**
   - Create an environment with variables:
     - `base_url`: `http://localhost:3001`
     - `api_url`: `http://localhost:3001/api`
     - `jwt_token`: Your JWT token

3. **Test Authentication**
   - Set the Authorization header: `Bearer {{jwt_token}}`
   - Test the `/auth/me` endpoint first

4. **Test All Endpoints**
   - Use the collection to test all endpoints systematically
   - Check response status codes and data

### 4. Testing with Frontend Integration

1. **Configure Frontend**
   ```bash
   cd ../frontend
   # Create .env file with:
   echo "VITE_API_URL=http://localhost:3001/api" > .env
   ```

2. **Start Frontend**
   ```bash
   npm run dev
   ```

3. **Test Integration**
   - Open the frontend in your browser
   - Test the login flow
   - Verify data is being fetched from the backend

## Authentication Testing

### Mock Authentication (Development)
For development testing, the auth middleware accepts mock tokens. Use:
```
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhdXRoMHxtb2NrLXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE2MzQ1Njc4NzQsImV4cCI6MTYzNDY1NDI3NH0.mock-signature
```

### Real Auth0 Authentication (Production)
1. Set up Auth0 application
2. Configure environment variables:
   - `AUTH0_DOMAIN`
   - `AUTH0_CLIENT_ID`
   - `AUTH0_CLIENT_SECRET`
   - `AUTH0_AUDIENCE`
3. Get real JWT tokens from Auth0

## Expected Responses

### Success Response Format
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

### Error Response Format
```json
{
  "error": "Error message",
  "details": "Additional error details"
}
```

### Common Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `500`: Internal Server Error

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure `CORS_ORIGIN` is set correctly in `.env`
   - Check that frontend URL matches the CORS configuration

2. **Authentication Errors**
   - Verify JWT token is valid
   - Check Auth0 configuration
   - Ensure token hasn't expired

3. **Database Connection Errors**
   - Verify MongoDB is running
   - Check `MONGODB_URI` in `.env`
   - Ensure database exists

4. **External API Errors**
   - Check API keys are configured
   - Verify external services are accessible
   - Check rate limits

### Debug Mode
Enable debug logging by setting:
```bash
LOG_LEVEL=debug
```

### Health Check
Always start with the health check endpoint:
```bash
curl http://localhost:3001/health
```

This should return:
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "uptime": 123.456,
  "environment": "development"
}
```

## Performance Testing

### Load Testing with Artillery
```bash
npm install -g artillery
artillery quick --count 100 --num 10 http://localhost:3001/health
```

### Memory and CPU Monitoring
```bash
# Monitor Node.js process
node --inspect src/index.ts

# Use Chrome DevTools for profiling
```

## Security Testing

### Input Validation
Test endpoints with invalid data:
- Empty strings
- Very long strings
- Special characters
- SQL injection attempts
- XSS payloads

### Rate Limiting
Test rate limiting by making many requests quickly:
```bash
for i in {1..150}; do curl http://localhost:3001/api/market/data/AAPL; done
```

### Authentication Bypass
Test endpoints without authentication tokens to ensure they're properly protected.


