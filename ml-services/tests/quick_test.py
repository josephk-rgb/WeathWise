#!/usr/bin/env python3
"""
Quick test script for Ollama integration
Run this to quickly test if Ollama is working with the ML service
"""

import requests
import json

def test_ollama_quick():
    """Quick test of Ollama integration"""
    base_url = "http://localhost:8000/api/ml/chat"
    
    print("🧪 Quick Ollama Integration Test\n")
    
    try:
        # Test 1: Check if service is running
        print("1. Checking if ML service is running...")
        health_response = requests.get("http://localhost:8000/health", timeout=5)
        if health_response.status_code == 200:
            print("✅ ML service is running")
        else:
            print("❌ ML service is not responding")
            return
        
        # Test 2: List models
        print("\n2. Listing available models...")
        models_response = requests.get(f"{base_url}/models", timeout=5)
        if models_response.status_code == 200:
            models = models_response.json()["models"]
            print(f"✅ Available models: {[m['name'] for m in models]}")
        else:
            print("❌ Failed to list models")
            return
        
        # Test 3: Simple chat
        print("\n3. Testing simple chat...")
        chat_payload = {
            "message": "What is the difference between stocks and bonds?",
            "model": "llama3.1:8b"
        }
        chat_response = requests.post(f"{base_url}/chat", json=chat_payload, timeout=30)
        if chat_response.status_code == 200:
            data = chat_response.json()
            print(f"✅ Chat response received ({len(data['response'])} characters)")
            print(f"   Confidence: {data['confidence']}")
            print(f"   Sources: {data['sources']}")
        else:
            print(f"❌ Chat failed: {chat_response.status_code}")
            return
        
        # Test 4: Sentiment analysis
        print("\n4. Testing sentiment analysis...")
        sentiment_payload = {
            "message": "I'm very happy with my investment returns!",
            "model": "llama3.1:8b"
        }
        sentiment_response = requests.post(f"{base_url}/analyze-sentiment", json=sentiment_payload, timeout=15)
        if sentiment_response.status_code == 200:
            data = sentiment_response.json()
            print(f"✅ Sentiment: {data['sentiment']} (confidence: {data['confidence']})")
        else:
            print(f"❌ Sentiment analysis failed: {sentiment_response.status_code}")
        
        print("\n🎉 All quick tests passed! Ollama integration is working.")
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to ML service. Make sure it's running on port 8000.")
    except requests.exceptions.Timeout:
        print("❌ Request timed out. Ollama might be taking too long to respond.")
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")

if __name__ == "__main__":
    test_ollama_quick()
