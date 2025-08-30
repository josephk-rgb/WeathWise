# ML Services Test Suite

This directory contains tests for the WeathWise ML services, specifically for testing the Ollama integration.

## Test Files

- `test_ollama_integration.py` - Comprehensive test suite for Ollama integration
- `quick_test.py` - Simple quick test script for basic functionality
- `conftest.py` - Pytest configuration and fixtures

## Prerequisites

1. **Ollama installed and running**
   ```bash
   brew services start ollama
   ```

2. **ML service running**
   ```bash
   cd ml-services
   source venv/bin/activate  # or ./venv/bin/Activate.ps1 on Windows
   python -m uvicorn main:app --reload --port 8000
   ```

3. **Required Python packages**
   ```bash
   pip install pytest pytest-asyncio httpx requests
   ```

## Running Tests

### Quick Test
For a fast check if everything is working:
```bash
cd ml-services/tests
python quick_test.py
```

### Full Test Suite
For comprehensive testing:
```bash
cd ml-services/tests
python test_ollama_integration.py
```

### Using Pytest
For more detailed test output:
```bash
cd ml-services/tests
pytest test_ollama_integration.py -v
```

## Test Coverage

The test suite covers:

1. **Model Management**
   - Listing available Ollama models
   - Model availability verification

2. **AI Chat Functionality**
   - Basic chat responses
   - Context-aware responses
   - Response quality validation
   - Financial knowledge verification

3. **Sentiment Analysis**
   - Sentiment detection
   - Confidence scoring
   - Response validation

4. **Error Handling**
   - Invalid model handling
   - Network error handling
   - Timeout handling

5. **Integration Testing**
   - End-to-end API testing
   - Response format validation
   - Performance testing

## Expected Results

When all tests pass, you should see:
- ✅ Available models listed
- ✅ Chat responses with >100 characters
- ✅ Sentiment analysis working
- ✅ Context handling working
- ✅ Financial keywords detected
- ✅ Error handling working

## Troubleshooting

### Common Issues

1. **ML service not running**
   - Error: "Cannot connect to ML service"
   - Solution: Start the ML service on port 8000

2. **Ollama not running**
   - Error: "Ollama request timed out"
   - Solution: Start Ollama service and ensure llama3.1:8b model is installed

3. **Model not found**
   - Error: "Ollama error: model not found"
   - Solution: Run `ollama pull llama3.1:8b`

4. **Virtual environment not activated**
   - Error: "Module not found"
   - Solution: Activate the virtual environment before running tests

### Debug Mode

To run tests with more verbose output:
```bash
pytest test_ollama_integration.py -v -s
```

## Performance Notes

- Chat responses typically take 5-15 seconds
- Sentiment analysis typically takes 3-8 seconds
- Model listing is nearly instant
- Set appropriate timeouts for your system performance
