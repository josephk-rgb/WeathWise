#!/bin/bash

echo "Setting up WeathWise AI development environment..."

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "Python 3 is required but not installed. Aborting." >&2; exit 1; }

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✓ Node.js version: $(node -v)"
echo "✓ Python version: $(python3 --version)"

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Setup frontend
echo "Setting up frontend..."
cd frontend
npm install
cd ..

# Setup backend
echo "Setting up backend..."
cd backend
npm install
mkdir -p logs
cd ..

# Setup ML services
echo "Setting up ML services..."
cd ml-services
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

# Create environment files if they don't exist
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local from template..."
    cp env.example .env.local
    echo "Please update .env.local with your actual configuration values"
fi

if [ ! -f "backend/.env" ]; then
    echo "Creating backend .env from template..."
    cp env.example backend/.env
    echo "Please update backend/.env with your actual configuration values"
fi

# Create logs directory
mkdir -p backend/logs

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update environment files with your actual configuration"
echo "2. Install Ollama: https://ollama.ai/"
echo "3. Set up MongoDB Atlas database"
echo "4. Configure Auth0 application"
echo ""
echo "To start development:"
echo "  npm run dev"
echo ""
echo "This will start:"
echo "  - Frontend: http://localhost:5173"
echo "  - Backend:  http://localhost:3001"
echo "  - ML Services: http://localhost:8000"

