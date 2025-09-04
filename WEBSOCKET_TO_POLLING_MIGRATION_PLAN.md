# WebSocket to Polling Migration Plan

**Objective:** Replace unstable WebSocket connections with reliable, efficient polling system  
**Expected Outcome:** 80% reduction in connection issues, improved cache utilization, simplified architecture

## 🎯 Migration Strategy

### **Why Polling is Better for WeathWise:**
1. **Financial data doesn't need sub-second updates** (30-60 second intervals are sufficient)
2. **HTTP caching works naturally** (WebSocket bypasses caches)
3. **No connection state management** (each request is independent)
4. **Better error handling** (failed request = retry next interval)
5. **Works through all firewalls/proxies** (WebSocket can be blocked)
6. **Simpler debugging and monitoring**

### **Current WebSocket Usage Analysis:**
- Market data updates every 5 seconds (overkill)
- Portfolio value updates every 30 seconds (reasonable)
- News alerts (could be polling every 5 minutes)
- Authentication heartbeat every 45 seconds (unnecessary with polling)

---

## 📋 Implementation Plan

### **Phase 1: Build Polling Infrastructure** ⏱️ 1-2 days

#### **1.1 Create PollingManager Service**
```typescript
// frontend/src/services/pollingManager.ts
class PollingManager {
  private activePollers: Map<string, PollingConfig>
  private visibilityHandler: boolean
  private globalBackoff: number
  
  // Adaptive intervals based on data freshness
  // Conditional requests using If-Modified-Since
  // Tab visibility detection (pause when hidden)
  // Error handling with exponential backoff
}
```

#### **1.2 Add Smart Polling Hook**
```typescript
// frontend/src/hooks/usePolling.ts
export const usePolling = ({
  fetchFn,
  interval = 30000,
  enabled = true,
  adaptiveInterval = true,
  pauseWhenHidden = true
}) => {
  // Smart interval adjustment
  // Automatic cleanup
  // Error boundary integration
}
```

#### **1.3 Backend: Add Conditional Response Headers**
```typescript
// backend: Add to all API responses
res.set('Last-Modified', lastModified.toUTCString());
res.set('Cache-Control', 'max-age=30'); // 30 second cache
```

### **Phase 2: Replace Real-time Components** ⏱️ 2-3 days

#### **2.1 Convert RealtimePortfolioValue**
**Current:** WebSocket subscription for portfolio updates  
**New:** Poll `/api/portfolio/value` every 30 seconds

```typescript
// Before: WebSocket
ws.send({ type: 'subscribe_portfolio' });

// After: Smart Polling
const { data, error } = usePolling({
  fetchFn: () => apiService.getPortfolioValue(),
  interval: 30000, // 30 seconds
  adaptiveInterval: true
});
```

#### **2.2 Convert MarketNewsWidget**
**Current:** 5-minute polling + WebSocket alerts  
**New:** Smart polling with longer intervals

```typescript
// Increase base interval from 5 minutes to 10 minutes
// Add adaptive intervals (slow down when no new articles)
// Use conditional requests to avoid unnecessary downloads
```

#### **2.3 Convert Market Data Components**
**Current:** WebSocket real-time price feeds  
**New:** Polling with jittered intervals

```typescript
// Poll market data every 30-60 seconds instead of 5 seconds
// Add jitter to prevent server spikes
// Group multiple symbol requests into batch calls
```

### **Phase 3: WebSocket Removal** ⏱️ 1 day

#### **3.1 Frontend Cleanup**
- Remove WebSocket initialization from `apiService`
- Remove WebSocket message handlers
- Clean up WebSocket types and interfaces
- Remove heartbeat/ping-pong logic

#### **3.2 Backend Cleanup**
- Remove WebSocket server setup from `index.ts`
- Delete `websocketService.ts`
- Remove WebSocket-related routes
- Clean up WebSocket dependencies

### **Phase 4: Optimization & Testing** ⏱️ 1-2 days

#### **4.1 Performance Optimization**
```typescript
// Implement smart batching
const batchedRequests = {
  '/api/portfolio/value': 30000,    // 30 seconds
  '/api/market/news': 600000,       // 10 minutes  
  '/api/analytics/dashboard': 180000, // 3 minutes
  '/api/market/prices': 45000       // 45 seconds with jitter
};
```

#### **4.2 Add Performance Monitoring**
```typescript
// Track polling efficiency
const metrics = {
  requestCount: number,
  cacheHitRate: number,
  averageResponseTime: number,
  errorRate: number
};
```

---

## 🛠️ Implementation Details

### **Smart Polling Features:**

#### **1. Adaptive Intervals**
```typescript
// Slow down when no changes detected
let baseInterval = 30000;
if (noChangesFor > 5 * 60 * 1000) { // 5 minutes
  interval = baseInterval * 2; // Double to 60 seconds
}

// Speed up during market hours
if (isMarketHours()) {
  interval = baseInterval * 0.75; // 22.5 seconds
}
```

#### **2. Conditional Requests**
```typescript
// Only fetch if data has changed
const headers = {};
if (lastModified) {
  headers['If-Modified-Since'] = lastModified;
}

const response = await fetch(url, { headers });
if (response.status === 304) {
  // No changes, use cached data
  return cachedData;
}
```

#### **3. Tab Visibility Control**
```typescript
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Pause all polling or slow it down significantly
    pollingManager.pauseAll();
  } else {
    // Resume normal polling
    pollingManager.resumeAll();
  }
});
```

#### **4. Error Handling with Backoff**
```typescript
let retryDelay = 1000; // Start with 1 second

async function pollWithBackoff() {
  try {
    const data = await fetchData();
    retryDelay = 1000; // Reset on success
    return data;
  } catch (error) {
    retryDelay = Math.min(retryDelay * 2, 60000); // Max 1 minute
    setTimeout(pollWithBackoff, retryDelay);
  }
}
```

### **Data Update Frequencies:**

| Data Type | Current WebSocket | New Polling | Reasoning |
|-----------|------------------|-------------|-----------|
| Portfolio Value | 30 seconds | 30 seconds | Keep same, works well |
| Market Prices | 5 seconds | 45 seconds | Reduce frequency, add jitter |
| News Articles | 5 minutes | 10 minutes | Most news isn't time-critical |
| Analytics Data | On demand | 3 minutes | Cache longer for dashboards |
| User Profile | On change | 10 minutes | Rarely changes |

---

## 🔍 Testing Strategy

### **Performance Comparison:**
1. **Measure before migration:**
   - API calls per minute
   - WebSocket reconnection frequency
   - Cache hit rates
   - User experience (perceived responsiveness)

2. **Measure after migration:**
   - Total HTTP requests per minute
   - Cache effectiveness
   - Response times
   - Error rates

### **Success Metrics:**
- [ ] **80% reduction in connection-related errors**
- [ ] **50% improvement in cache hit rates**
- [ ] **30% reduction in total API calls**
- [ ] **No degradation in user experience**
- [ ] **Simplified monitoring and debugging**

### **Rollback Plan:**
- Keep WebSocket code in feature flags
- A/B testing with percentage of users
- Quick toggle between polling and WebSocket
- Monitor error rates during transition

---

## 🚀 Implementation Timeline

### **Week 1:**
- **Day 1-2:** Build PollingManager and usePolling hook
- **Day 3-4:** Add backend conditional response headers
- **Day 5:** Test polling infrastructure

### **Week 2:**
- **Day 1-2:** Convert RealtimePortfolioValue and MarketNewsWidget
- **Day 3:** Convert market data components
- **Day 4:** Remove WebSocket code (frontend + backend)
- **Day 5:** Performance testing and optimization

### **Deployment Strategy:**
1. **Feature flag rollout** (10% of users initially)
2. **Monitor for 48 hours** (check error rates, performance)
3. **Gradual increase** (25%, 50%, 75%, 100%)
4. **Complete WebSocket removal** after 1 week of stable polling

---

## 💡 Additional Benefits

### **Simplified Architecture:**
- No WebSocket state management
- No connection lifecycle handling
- No authentication token refresh issues
- Standard HTTP error handling

### **Better Observability:**
- Standard HTTP request logging
- Clear request/response patterns
- HTTP status codes for debugging
- Cache headers for optimization

### **Future Scalability:**
- HTTP/2 multiplexing benefits
- CDN caching possibilities
- Standard load balancer support
- Better integration with monitoring tools

This migration will transform WeathWise from a complex, connection-prone real-time system into a simple, reliable, and efficient polling-based architecture that better matches the actual requirements of a financial dashboard application.
