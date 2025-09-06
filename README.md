# WeathWise AI - Intelligent Financial Advisor Bot

WeathWise AI is a sophisticated financial advisor bot that revolutionizes personal finance management through AI-driven portfolio analysis, real-time market intelligence, and personalized investment strategies.

## 🚀 Features

- **Intelligent Portfolio Analysis** - AI-driven investment performance evaluation
- **Real-time Market Intelligence** - Live market data integration and trend analysis
- **Personalized Investment Strategies** - ML-powered recommendations based on risk profile
- **Natural Language Interface** - Chat with your finances using local AI (Ollama)
- **Comprehensive Financial Management** - Budget tracking, goal planning, and debt management

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + TypeScript)           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Dashboard   │  │ Portfolio   │  │ AI Chat     │         │
│  │ Analytics   │  │ Management  │  │ Interface   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   API Gateway     │
                    │  (Vercel Edge)    │
                    └─────────┬─────────┘
                              │
┌─────────────────────────────┴─────────────────────────────┐
│                 Backend Services                          │
├───────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │   Auth      │  │  Financial  │  │    ML       │       │
│  │  Service    │  │   Data      │  │  Engine     │       │
│  │  (Auth0)    │  │  Processor  │  │             │       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
└───────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────┴─────────────────────────────┐
│                External Services                          │
├───────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │  MongoDB    │  │  Market     │  │   Local     │       │
│  │  Atlas      │  │  Data APIs  │  │   AI        │       │
│  │             │  │ (Yahoo/AV)  │  │ (Ollama)    │       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
└───────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
WeathWise/
├── frontend/                 # React + TypeScript frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/          # Route components
│   │   ├── services/       # API services
│   │   ├── store/          # State management
│   │   └── utils/          # Utility functions
│   └── package.json
├── backend/                 # Node.js + Express backend
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utility functions
│   └── package.json
├── ml-services/            # Python + FastAPI ML services
│   ├── routes/            # ML API routes
│   ├── models/            # Trained ML models
│   ├── training/          # Model training scripts
│   └── requirements.txt
├── docs/                  # Project documentation
└── scripts/               # Setup and utility scripts
```

## 🛠️ Prerequisites

- **Node.js**: v18.17+ (LTS recommended)
- **Python**: v3.9+ (for ML models and data processing)
- **Git**: Latest version for version control
- **Ollama**: For local AI processing ([Install Ollama](https://ollama.ai/))

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone <repository-url>
cd WeathWise
```

### 2. Run the setup script
```bash
./scripts/setup-dev.sh
```

### 3. Configure environment variables
Copy the example environment files and update them with your actual values:
```bash
cp env.example .env.local
cp env.example backend/.env
```

### 4. Start development servers
```bash
npm run dev
```

This will start:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001
- **ML Services**: http://localhost:8000

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev                    # Start all services
npm run dev:frontend          # Start frontend only
npm run dev:backend           # Start backend only
npm run dev:ml               # Start ML services only

# Building
npm run build                # Build all services
npm run build:frontend       # Build frontend
npm run build:backend        # Build backend

# Testing
npm run test                 # Run all tests
npm run test:frontend        # Test frontend
npm run test:backend         # Test backend

# Linting
npm run lint                 # Lint all code
npm run lint:frontend        # Lint frontend
npm run lint:backend         # Lint backend
```

### Environment Configuration

#### Frontend (.env.local)
```bash
VITE_API_BASE_URL=http://localhost:3001/api
VITE_AUTH0_DOMAIN=your-auth0-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-auth0-client-id
VITE_OLLAMA_BASE_URL=http://localhost:11434
```

#### Backend (.env)
```bash
PORT=3001
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/wealthwise
AUTH0_DOMAIN=your-auth0-domain.auth0.com
AUTH0_CLIENT_SECRET=your-auth0-client-secret
```

## 🗄️ Database Setup

### MongoDB Atlas
1. Create a free MongoDB Atlas account
2. Create a new cluster
3. Set up database access (username/password)
4. Configure network access (IP whitelist)
5. Get your connection string and add it to `backend/.env`

### Database Collections
- `users` - User profiles and preferences
- `investments` - Investment holdings
- `transactions` - Financial transactions
- `portfolio_history` - Historical portfolio data
- `goals` - Financial goals and targets

## 🔐 Authentication Setup

### Auth0 Configuration
1. Create an Auth0 account
2. Create a new application (SPA)
3. Configure callback URLs
4. Set up API with appropriate scopes
5. Update environment variables with your Auth0 credentials

## 🤖 AI Integration

### Ollama Setup
1. Install Ollama from [ollama.ai](https://ollama.ai/)
2. Download recommended models:
```bash
ollama pull llama3.1:8b
ollama pull mistral:7b
ollama pull codellama:7b
```

### Custom Financial Model
```bash
# Create custom model for financial advice
ollama create wealthwise-advisor -f ./Modelfile
```

## 📊 ML Services

The ML services provide:
- **Portfolio Analysis** - Risk assessment and optimization
- **Market Prediction** - Price forecasting and trend analysis
- **Risk Assessment** - VaR, stress testing, and risk metrics
- **AI Chat** - Natural language financial advice

## 🧪 Testing

```bash
# Frontend tests
cd frontend && npm run test

# Backend tests
cd backend && npm run test

# ML services tests
cd ml-services && python -m pytest
```

## 📚 Documentation

Comprehensive documentation is available in the `docs/` folder:

- [Project Overview](docs/01-project-overview.md)
- [Development Setup](docs/02-development-setup.md)
- [Database Design](docs/03-database-design.md)
- [Authentication & Security](docs/04-auth-security.md)
- [AI & ML Integration](docs/05-ai-ml-integration.md)
- [Backend Development](docs/06-backend-development.md)
- [Frontend Implementation](docs/07-frontend-implementation.md)
- [Financial Data Integration](docs/08-financial-data-integration.md)
- [Real-time Features](docs/09-realtime-features.md)
- [Testing & QA](docs/10-testing-qa.md)
- [Deployment & Infrastructure](docs/11-deployment-infrastructure.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Check the [documentation](docs/)
- Open an [issue](../../issues)
- Contact the development team

## 🗺️ Roadmap

- [ ] Complete Auth0 integration
- [ ] Implement real-time market data
- [ ] Add advanced ML models
- [ ] Mobile app development
- [ ] Advanced portfolio analytics
- [ ] Social trading features
- [ ] Cryptocurrency integration
