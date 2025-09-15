import asyncio
import os
import sys
import pytest
from httpx import AsyncClient

# Ensure repository root (ml-services) is on path so `from main import app` works
CURRENT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, os.pardir))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


@pytest.mark.asyncio
async def test_chat_uses_backend_proxy_context(monkeypatch):
    # Import app
    from main import app

    # Track calls
    calls = {"backend_proxy": 0}

    # Mock backend proxy to simulate DB-backed context
    class MockBackendProxy:
        async def get_user_financial_data_with_auth(self, user_id: str, token: str):
            calls["backend_proxy"] += 1
            # Return a minimal but valid context shape
            return {
                "profile": {"risk_profile": "aggressive"},
                "accounts": {"total_balance": 12345},
                "investments": {"total_value": 98765, "top_holdings": [{"symbol": "AAPL"}, {"symbol": "MSFT"}]},
                "transactions": [],
                "portfolio": {"totalValue": 98765},
            }

        # allow attribute access like backend_proxy.method
        def __getattr__(self, name):
            return getattr(self, name)

    # Patch in the recommender and chat routers
    from routes import ai_chat, recommendations
    monkeypatch.setattr(ai_chat, "backend_proxy", MockBackendProxy())
    monkeypatch.setattr(recommendations, "backend_proxy", MockBackendProxy())

    async with AsyncClient(app=app, base_url="http://test") as client:
        # With Authorization - should invoke backend proxy and produce a 200
        resp = await client.post(
            "/api/ml/chat/chat",
            headers={"Authorization": "Bearer test.jwt"},
            json={
                "message": "How am I doing financially?",
                "user_id": "user_123",
                "include_financial_data": True,
                "model": "llama3.1:8b",
            },
            timeout=60.0,
        )

        # We don't rely on Ollama here; if Ollama is not available, ML route may 500.
        # The key assertion is whether backend proxy was invoked for context fetch.
        assert calls["backend_proxy"] == 1


@pytest.mark.asyncio
async def test_recommendations_uses_backend_proxy_context(monkeypatch):
    from main import app

    calls = {"backend_proxy": 0}

    class MockBackendProxy:
        async def get_user_financial_data_with_auth(self, user_id: str, token: str):
            calls["backend_proxy"] += 1
            return {
                "profile": {"risk_profile": "moderate"},
                "accounts": {"total_balance": 22222},
                "investments": {"total_value": 33333, "top_holdings": [{"symbol": "VTI"}]},
                "transactions": [],
                "portfolio": {"totalValue": 33333},
            }

        def __getattr__(self, name):
            return getattr(self, name)

    from routes import recommendations
    monkeypatch.setattr(recommendations, "backend_proxy", MockBackendProxy())

    async with AsyncClient(app=app, base_url="http://test") as client:
        resp = await client.post(
            "/api/ml/recommendations/generate",
            headers={"Authorization": "Bearer test.jwt"},
            json={
                "user_id": "user_123",
                "scope": "dashboard",
                "max": 5,
                "model": "llama3.1:8b",
            },
            timeout=60.0,
        )

        # Even if Ollama fails in CI, ensure proxy was called to build context
        assert calls["backend_proxy"] == 1


