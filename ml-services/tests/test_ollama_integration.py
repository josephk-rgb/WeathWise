import asyncio
import httpx
import json
import pytest
from typing import Dict, Any

# Test configuration
BASE_URL = "http://localhost:8000/api/ml/chat"

class TestOllamaIntegration:
    """Test suite for Ollama integration with WeathWise ML services"""
    
    @pytest.mark.asyncio
    async def test_list_models(self):
        """Test listing available Ollama models"""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BASE_URL}/models")
            assert response.status_code == 200
            data = response.json()
            assert "models" in data
            assert len(data["models"]) > 0
            print(f"✅ Available models: {data['models']}")
    
    @pytest.mark.asyncio
    async def test_basic_chat(self):
        """Test basic AI chat functionality"""
        async with httpx.AsyncClient() as client:
            payload = {
                "message": "What are the key principles of diversification in investing?",
                "model": "llama3.1:8b"
            }
            response = await client.post(f"{BASE_URL}/chat", json=payload)
            assert response.status_code == 200
            data = response.json()
            assert "response" in data
            assert "confidence" in data
            assert "sources" in data
            assert len(data["response"]) > 100  # Should have substantial response
            print(f"✅ Chat response length: {len(data['response'])} characters")
            print(f"✅ Confidence: {data['confidence']}")
            print(f"✅ Sources: {data['sources']}")
    
    @pytest.mark.asyncio
    async def test_sentiment_analysis(self):
        """Test sentiment analysis functionality"""
        async with httpx.AsyncClient() as client:
            payload = {
                "message": "I'm feeling optimistic about my investment portfolio!",
                "model": "llama3.1:8b"
            }
            response = await client.post(f"{BASE_URL}/analyze-sentiment", json=payload)
            assert response.status_code == 200
            data = response.json()
            assert "sentiment" in data
            assert "confidence" in data
            assert data["sentiment"] in ["positive", "negative", "neutral"]
            print(f"✅ Sentiment: {data['sentiment']}")
            print(f"✅ Confidence: {data['confidence']}")
    
    @pytest.mark.asyncio
    async def test_chat_with_context(self):
        """Test chat with additional context"""
        async with httpx.AsyncClient() as client:
            payload = {
                "message": "Should I invest in index funds or individual stocks?",
                "context": {
                    "portfolio_data": True,
                    "user_experience": "beginner",
                    "risk_tolerance": "moderate"
                },
                "model": "llama3.1:8b"
            }
            response = await client.post(f"{BASE_URL}/chat", json=payload)
            assert response.status_code == 200
            data = response.json()
            assert "response" in data
            assert "sources" in data
            # Should include portfolio_data in sources when context is provided
            assert "portfolio_data" in data["sources"]
            print(f"✅ Contextual response length: {len(data['response'])} characters")
            print(f"✅ Sources with context: {data['sources']}")
    
    @pytest.mark.asyncio
    async def test_financial_advice_quality(self):
        """Test quality of financial advice responses"""
        async with httpx.AsyncClient() as client:
            payload = {
                "message": "What is compound interest and how does it work?",
                "model": "llama3.1:8b"
            }
            response = await client.post(f"{BASE_URL}/chat", json=payload)
            assert response.status_code == 200
            data = response.json()
            response_text = data["response"].lower()
            
            # Check for key financial concepts in response
            financial_keywords = ["interest", "compound", "principal", "rate", "time"]
            found_keywords = [keyword for keyword in financial_keywords if keyword in response_text]
            assert len(found_keywords) >= 3, f"Response should contain financial keywords. Found: {found_keywords}"
            print(f"✅ Financial keywords found: {found_keywords}")
    
    @pytest.mark.asyncio
    async def test_error_handling(self):
        """Test error handling for invalid requests"""
        async with httpx.AsyncClient() as client:
            # Test with invalid model
            payload = {
                "message": "Test message",
                "model": "invalid_model"
            }
            response = await client.post(f"{BASE_URL}/chat", json=payload)
            # Should handle gracefully even with invalid model
            assert response.status_code in [200, 500]  # Either success or proper error
            print(f"✅ Error handling test completed with status: {response.status_code}")

async def run_tests():
    """Run all tests manually"""
    print("🧪 Running Ollama Integration Tests...\n")
    
    test_instance = TestOllamaIntegration()
    
    try:
        await test_instance.test_list_models()
        print()
        
        await test_instance.test_basic_chat()
        print()
        
        await test_instance.test_sentiment_analysis()
        print()
        
        await test_instance.test_chat_with_context()
        print()
        
        await test_instance.test_financial_advice_quality()
        print()
        
        await test_instance.test_error_handling()
        print()
        
        print("🎉 All tests completed successfully!")
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")

if __name__ == "__main__":
    asyncio.run(run_tests())
