"""
Pytest configuration for ML services tests
"""

import pytest
import asyncio
import httpx
from typing import AsyncGenerator

# Test configuration
TEST_BASE_URL = "http://localhost:8000"
TEST_TIMEOUT = 30

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
async def async_client() -> AsyncGenerator[httpx.AsyncClient, None]:
    """Async HTTP client for testing"""
    async with httpx.AsyncClient(timeout=TEST_TIMEOUT) as client:
        yield client

@pytest.fixture
def test_chat_payload():
    """Sample chat payload for testing"""
    return {
        "message": "What is the best way to start investing?",
        "model": "llama3.1:8b",
        "context": {
            "user_experience": "beginner",
            "risk_tolerance": "moderate"
        }
    }

@pytest.fixture
def test_sentiment_payload():
    """Sample sentiment analysis payload for testing"""
    return {
        "message": "I'm feeling optimistic about my investment portfolio!",
        "model": "llama3.1:8b"
    }

def pytest_configure(config):
    """Configure pytest"""
    config.addinivalue_line(
        "markers", "asyncio: mark test as async"
    )

def pytest_collection_modifyitems(config, items):
    """Add asyncio marker to async tests"""
    for item in items:
        if asyncio.iscoroutinefunction(item.function):
            item.add_marker(pytest.mark.asyncio)
