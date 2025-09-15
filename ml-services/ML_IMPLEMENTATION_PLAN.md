# WeathWise ML Implementation Plan (Model-based)

This plan keeps the ML layer inside `ml-services` while minimizing coupling and defining clear contracts so the backend and frontend can integrate safely.

## Goals
- Maintain a true ML component for the Recommendation Engine while keeping endpoints stable and simple.
- Reuse existing Yahoo Finance analytics from the backend; avoid duplicating risk metric pipelines.
- Provide thin, stateless model APIs for Optimizer and Sentiment in `ml-services`.

## Architecture (High-level)

Frontend → Backend (auth, orchestration) → ml-services (FastAPI)
- Backend remains source of truth for user context and risk metrics.
- ml-services provides:
  - Portfolio Optimizer API (weights + optional frontier)
  - Market Sentiment API (model-in-the-loop prediction; optional training)
  - Recommendation Engine API (model-driven synthesis)

## Environment and Config
- BACKEND_API_URL: Node backend API base (e.g., `http://localhost:3001/api`)
- OLLAMA_BASE_URL: Only for AI chat; not required for the recommender.
- CACHE_TTLS: Per-endpoint TTLs (symbol sentiment: 30–60m; optimizer: 1–6h by ticker set)
- Optional news API keys: for enriched sentiment (can be disabled initially)

## Data Contracts

- Optimizer request
  - `{ symbols: string[], risk_tolerance?: 'conservative'|'moderate'|'aggressive', current_weights?: number[], target_return?: number }`
- Optimizer response
  - `{ weights: Record<string, number>, portfolio_stats?: {...}, asset_stats?: Record<string, {...}>, risk_metrics?: {...}, efficient_frontier?: { returns: number[], volatilities: number[], sharpe_ratios: number[], weights: number[][] } }`
- Sentiment inference
  - `GET /sentiment/:symbol → { symbol, combined_sentiment: 'positive'|'neutral'|'negative', confidence: number, technical_probabilities?: Record<string, number>, timestamp: string }`
- Sentiment training
  - `POST /train-sentiment-model → { accuracy?: number, feature_importance?: Record<string, number>, training_samples?: number, test_samples?: number }`
- Recommendation result
  - `POST /recommendations → { recommendations: Array<{ symbol: string, action: 'buy'|'sell'|'hold', targetAllocation: number, confidence: number, reasoning: string[], expectedReturn?: number, riskScore?: number, timeHorizon: 'short'|'medium'|'long' }> }`

## Components and Implementation Strategy

### 1) Portfolio Optimizer (FastAPI)
- Purpose: Given user holdings (tickers) and risk tolerance, produce target weights and an optional efficient frontier for visualization.
- Input construction:
  - If caller omits `symbols`, load user context via `BackendProxyService.get_user_financial_data_with_auth(user_id, token)` and derive `symbols` and `current_weights` from `portfolio.holdings`.
- Simplified initial phase:
  - Implement Modern Portfolio Theory optimizer per docs (scipy/yfinance). Limit to daily closes; no intraday.
  - Cap symbols to top 5–10 by value to control latency.
- Output:
  - `weights` as normalized targets.
  - Optional frontier arrays for UI analytics page.
- Caching:
  - Cache results keyed by sorted symbols + riskTolerance + (rounded) current_weights signature.

Endpoints
- `POST /optimize-portfolio`
- `POST /efficient-frontier`

### 2) Market Sentiment Analyzer (FastAPI)
- Purpose: Per-symbol sentiment for short-horizon nudging.
- Model path:
  - Phase 1: Technical-feature classifier (RandomForest) trained on 1y daily features (RSI, MACD, momentum, volatility). Persist model to disk or memory; add a checksum for the feature set.
  - Phase 2: Optionally blend basic news sentiment (TextBlob or API) with small weight.
- Train flow:
  - Batch train on a curated universe (top platform tickers + major ETFs). Schedule nightly.
  - Return metrics and feature importances for monitoring.
- Predict flow:
  - `GET /sentiment/{symbol}`: compute latest feature vector, scale, predict label and probabilities, blend with news score (if enabled), return label and confidence.
- Caching:
  - Cache predictions per symbol with TTL 30–60 minutes.

Endpoints
- `POST /train-sentiment-model`
- `GET /sentiment/{symbol}`

### 3) Recommendation Engine (Model-based, in ml-services)
- Purpose: Synthesize optimizer targets, sentiment predictions, and backend-provided risk metrics into clear actions.
- Inputs:
  - User context: fetched via backend proxy (tickers, current allocations, risk profile). No PII beyond what’s needed.
  - Optimizer: `POST /optimize-portfolio`
  - Sentiment: `GET /sentiment/:symbol` for top holdings (parallelized)
  - Risk metrics: from backend `GET /portfolio/analytics` (Sharpe/Vol/VaR). Used for messaging, not gating.
- Model logic:
  - Use a lightweight meta-model (e.g., gradient boosted trees or logistic regression) trained to rank action candidates using features:
    - Drift magnitude vs target, symbol momentum, volatility proxy, sentiment confidence, risk profile encoding, allocation concentration flags.
  - Output ranked actions (buy/sell/hold with targetAllocation deltas) and confidence.
- Guardrails:
  - Action caps (e.g., suggest max 5–10% allocation change per cycle).
  - Drift threshold (e.g., 5%) to reduce churn.
- Caching/fallbacks:
  - If optimizer fails, degrade to drift-only heuristic.
  - If sentiment missing, proceed with optimizer-only actions.

Endpoint
- `POST /recommendations` (accepts `user_id` and uses Authorization header to fetch context via backend proxy; returns ordered actions)

## Orchestration Flow
1. Backend receives UI request (e.g., refresh recommendations) and forwards to `ml-services` with JWT and user_id.
2. ml-services Recommendation API:
   - Uses backend proxy to fetch holdings + risk profile
   - Calls Optimizer and Sentiment in parallel (top holdings only)
   - Reads backend `portfolio/analytics` for metrics
   - Runs model to rank actions and returns a compact list
3. Backend relays the result to frontend.

## Rollout Phases
- Phase 0: Contracts & stubs
  - Finalize endpoint contracts and minimal stub responses.
- Phase 1: Baselines
  - Optimizer (MPT), Sentiment (RF technicals), Recommender (rules + scoring blend).
  - Add caches and timeouts; cap symbols = 10.
- Phase 2: Model-in-the-loop recommender
  - Train a lightweight ranking model using historical simulated actions (from optimizer drift + sentiment signals) as supervision; A/B test against rules.
- Phase 3: UX & analytics
  - Add efficient frontier visualization and confidence badges. Add exportable reasoning.
- Phase 4: Hardening
  - Monitoring (latency, error rates), scheduled training, model versioning, feature checksum, alerting.

## Monitoring & SLOs
- Log per endpoint: latency, cache hit rate, error rate, payload sizes.
- Targets: p95 ≤ 3s for recommendations (with caches); ≤ 2s for sentiment; ≤ 3s for optimizer (≤ 10 symbols).

## Security & Privacy
- ml-services never stores JWTs or PII. It only forwards the Authorization header to backend via the proxy.
- Models operate on tickers, weights, and aggregate metrics.

## Testing Strategy
- Unit tests: optimizer objective and normalization; sentiment feature pipeline; recommender ranking monotonicity.
- Contract tests: ensure stable request/response shapes.
- Integration tests: end-to-end recommendation flow for a seeded demo user.

## Open Questions / Decisions
- Universe for training sentiment: top N platform tickers? update cadence?
- Frontier visualization granularity and sampling count (default 100 portfolios).
- Recommender label definition for initial training (simulate labels from drift/sentiment rules or curated playbook?).

---

This plan preserves a real ML footprint (sentiment + model-based recommender) while keeping endpoints simple and leveraging existing backend analytics. Adjust TTLs and symbol caps to meet performance budgets.
