"""
Resilient Test Script: avoids .info/.fast_info pitfalls, with safe fallbacks
"""

import os
import yfinance as yf
import requests
import pandas as pd

TICKER = "AAPL"
FMP_API_KEY = os.getenv("FMP_API_KEY", "demo")

stock = yf.Ticker(TICKER)

# -------------------------
# Snapshot with safe fallback
# -------------------------
try:
    # Try fast_info
    fi = stock.fast_info
    price = getattr(fi, "last_price", None)
    market_cap = getattr(fi, "market_cap", None)
    shares_outstanding = getattr(fi, "shares_outstanding", None)
except Exception:
    fi = None
    price = None
    market_cap = None
    shares_outstanding = None

# Fallback to latest close if price missing
if price is None:
    try:
        latest = stock.history(period="1d")["Close"].iloc[-1]
        price = float(latest)
    except Exception:
        price = None

snapshot = {
    "symbol": TICKER,
    "price": price,
    "market_cap": market_cap,
    "shares_outstanding": shares_outstanding,
}

# -------------------------
# Financials & ratios
# -------------------------
valuation = {}
financials = {}

try:
    bs = stock.balance_sheet
    is_ = stock.financials

    if bs is not None and not bs.empty:
        equity = bs.loc["Total Assets"][0] - bs.loc["Total Liab"][0]
        if equity > 0 and market_cap:
            valuation["pb"] = market_cap / equity

    if is_ is not None and not is_.empty:
        revenue = is_.loc["Total Revenue"][0]
        gross = is_.loc["Gross Profit"][0]
        op_income = is_.loc["Operating Income"][0]
        net_income = is_.loc["Net Income"][0]

        financials["gross_margin"] = gross / revenue if revenue else None
        financials["operating_margin"] = op_income / revenue if revenue else None
        if shares_outstanding and shares_outstanding > 0:
            financials["eps"] = net_income / shares_outstanding
except Exception as e:
    financials = {"error": str(e)}

# -------------------------
# Performance Metrics
# -------------------------
perf = {}
try:
    hist = stock.history(period="1y")
    if not hist.empty:
        perf = {
            "ret_1m": hist["Close"].pct_change(21).iloc[-1],
            "ret_3m": hist["Close"].pct_change(63).iloc[-1],
            "ret_6m": hist["Close"].pct_change(126).iloc[-1],
            "ret_1y": hist["Close"].pct_change(252).iloc[-1],
            "vol_30d": hist["Close"].pct_change().rolling(30).std().iloc[-1],
            "max_drawdown": (hist["Close"] / hist["Close"].cummax() - 1).min(),
            "52w_low": hist["Close"].min(),
            "52w_high": hist["Close"].max(),
        }
except Exception as e:
    perf = {"error": str(e)}

# -------------------------
# Sector comparables (FMP)
# -------------------------
sector_data = {}
try:
    url = f"https://financialmodelingprep.com/api/v4/sector_price_earning_ratio?apikey={FMP_API_KEY}"
    r = requests.get(url, timeout=10)
    if r.ok:
        data = r.json()
        # Hardcode AAPL sector to Technology
        match = next((d for d in data if d["sector"] == "Technology"), None)
        if match:
            sector_data = {
                "sector_pe": match.get("peRatio"),
                "sector_pb": match.get("pbRatio"),
                "sector_ev_ebitda": match.get("enterpriseValueOverEBITDA"),
            }
except Exception as e:
    sector_data = {"error": str(e)}

# -------------------------
# Print results
# -------------------------
print("\n=== Snapshot ===")
print(snapshot)
print("\n=== Valuation ===")
print(valuation)
print("\n=== Financials ===")
print(financials)
print("\n=== Performance ===")
print(perf)
print("\n=== Sector Comparables (FMP) ===")
print(sector_data)