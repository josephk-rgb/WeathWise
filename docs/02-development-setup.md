# Part 2: Development Environment Setup

## 2.1 Prerequisites

### System Requirements
- **Node.js**: v18.17+ (LTS recommended)
- **npm**: v9+ or **pnpm**: v8+ (for faster builds)
- **Python**: v3.9+ (for ML models and data processing)
- **Git**: Latest version for version control
- **Docker**: For containerized services (optional but recommended)

### Development Tools
- **VS Code** with recommended extensions:
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense
  - Auto Rename Tag
  - GitLens
  - Thunder Client (API testing)
  - MongoDB for VS Code

## 2.2 Project Structure Setup

### Frontend Structure
```
src/
├── components/          # React components
│   ├── Charts/         # Financial data visualizations
│   ├── Chat/           # AI chat interface
│   ├── Dashboard/      # Dashboard widgets
│   ├── Forms/          # Form components
│   ├── Layout/         # App layout components
│   └── UI/             # Reusable UI components
├── pages/              # Route components
├── services/           # API services and integrations
├── store/              # State management (Zustand)
├── types/              # TypeScript definitions
├── utils/              # Utility functions
├── hooks/              # Custom React hooks
└── assets/             # Static assets
```

### Backend Structure (to be created)
```
server/
├── src/
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Express middleware
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── utils/          # Utility functions
│   └── types/          # TypeScript definitions
├── tests/              # Test files
├── scripts/            # Build and deployment scripts
└── config/             # Configuration files
```

### ML Services Structure (to be created)
```
ml-services/
├── models/             # Trained ML models
├── training/           # Model training scripts
├── inference/          # Real-time inference
├── backtesting/        # Strategy backtesting
└── data/               # Data processing pipelines
```

## 2.3 Environment Configuration

### Frontend Environment (.env.local)
```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001

# Auth0 Configuration
VITE_AUTH0_DOMAIN=your-auth0-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-auth0-client-id
VITE_AUTH0_AUDIENCE=https://your-api-identifier

# Financial Data APIs
VITE_ALPHA_VANTAGE_KEY=your-alpha-vantage-key
VITE_YAHOO_FINANCE_KEY=your-yahoo-finance-key
VITE_IEX_CLOUD_KEY=your-iex-cloud-key

# Local AI Configuration
VITE_OLLAMA_BASE_URL=http://localhost:11434
VITE_OLLAMA_MODEL=llama3.1:8b

# Feature Flags
VITE_ENABLE_AI_CHAT=true
VITE_ENABLE_REAL_TIME=true
VITE_ENABLE_ML_RECOMMENDATIONS=true
```

### Backend Environment (.env)
```bash
# Server Configuration
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/wealthwise
MONGODB_DB_NAME=wealthwise
REDIS_URL=redis://localhost:6379

# Auth0 Configuration
AUTH0_DOMAIN=your-auth0-domain.auth0.com
AUTH0_CLIENT_ID=your-auth0-backend-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
AUTH0_AUDIENCE=https://your-api-identifier

# Encryption Keys
ENCRYPTION_KEY=your-32-character-encryption-key
JWT_SECRET=your-jwt-secret-key

# External APIs
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-key
YAHOO_FINANCE_API_KEY=your-yahoo-finance-key
IEX_CLOUD_API_KEY=your-iex-cloud-key

# ML Service Configuration
PYTHON_ML_SERVICE_URL=http://localhost:8000
OLLAMA_BASE_URL=http://localhost:11434

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 2.4 Database Setup (MongoDB Atlas)

### Creating MongoDB Cluster

1. **Sign up for MongoDB Atlas**
   - Go to [MongoDB Atlas](https://cloud.mongodb.com/)
   - Create a free account
   - Choose the M0 (Free) cluster for development

2. **Cluster Configuration**
   ```javascript
   // Recommended cluster settings
   {
     "clusterType": "REPLICASET",
     "replicationSpecs": [{
       "numShards": 1,
       "regionsConfig": {
         "US_EAST_1": {
           "analyticsNodes": 0,
           "electableNodes": 3,
           "readOnlyNodes": 0
         }
       }
     }],
     "backupEnabled": true,
     "encryptionAtRestProvider": "AWS"
   }
   ```

3. **Database Setup Script**
   ```javascript
   // database/setup.js
   use wealthwise;

   // Create collections with validation
   db.createCollection('users', {
     validator: {
       $jsonSchema: {
         bsonType: 'object',
         required: ['email', 'auth0Id', 'createdAt'],
         properties: {
           email: { bsonType: 'string' },
           auth0Id: { bsonType: 'string' },
           profile: {
             bsonType: 'object',
             properties: {
               firstName: { bsonType: 'string' },
               lastName: { bsonType: 'string' },
               riskProfile: { enum: ['conservative', 'moderate', 'aggressive'] }
             }
           }
         }
       }
     }
   });

   // Create indexes for performance
   db.users.createIndex({ "auth0Id": 1 }, { unique: true });
   db.users.createIndex({ "email": 1 }, { unique: true });
   
   db.transactions.createIndex({ "userId": 1, "date": -1 });
   db.investments.createIndex({ "userId": 1, "symbol": 1 });
   db.portfolioHistory.createIndex({ "userId": 1, "date": -1 });
   ```

### Database Schema Design

```typescript
// src/types/database.ts

interface UserDocument {
  _id: ObjectId;
  auth0Id: string;
  email: string;
  profile: {
    firstName: string;
    lastName: string;
    avatar?: string;
    riskProfile: 'conservative' | 'moderate' | 'aggressive';
    preferences: {
      currency: string;
      timezone: string;
      notifications: boolean;
    };
  };
  encryption: {
    keyId: string;
    algorithm: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface InvestmentDocument {
  _id: ObjectId;
  userId: ObjectId;
  symbol: string;
  name: string;
  shares: number;
  purchasePrice: number; // Encrypted
  currentPrice: number;
  type: 'stock' | 'crypto' | 'etf' | 'bond' | 'real_estate' | '401k';
  purchaseDate: Date;
  metadata: {
    sector?: string;
    industry?: string;
    country?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

## 2.5 Auth0 Configuration

### Auth0 Setup Steps

1. **Create Auth0 Account**
   - Sign up at [Auth0](https://auth0.com/)
   - Create a new tenant for your application

2. **Application Configuration**
   ```json
   {
     "name": "WeathWise AI",
     "description": "Financial Advisor Bot Application",
     "applicationType": "spa",
     "callbacks": [
       "http://localhost:5173/callback",
       "https://your-domain.vercel.app/callback"
     ],
     "webOrigins": [
       "http://localhost:5173",
       "https://your-domain.vercel.app"
     ],
     "corsOrigins": [
       "http://localhost:5173",
       "https://your-domain.vercel.app"
     ]
   }
   ```

3. **API Configuration**
   ```json
   {
     "name": "WeathWise API",
     "identifier": "https://api.wealthwise.com",
     "signingAlgorithm": "RS256",
     "scopes": [
       "read:profile",
       "write:profile",
       "read:transactions",
       "write:transactions",
       "read:investments",
       "write:investments",
       "admin:users"
     ]
   }
   ```

4. **Rules and Actions**
   ```javascript
   // Auth0 Action: Add user metadata
   exports.onExecutePostLogin = async (event, api) => {
     const { user } = event;
     
     // Add custom claims to token
     api.idToken.setCustomClaim('https://wealthwise.com/roles', user.app_metadata?.roles || []);
     api.accessToken.setCustomClaim('https://wealthwise.com/permissions', user.app_metadata?.permissions || []);
     
     // First-time user setup
     if (event.stats.logins_count === 1) {
       const ManagementClient = require('auth0').ManagementClient;
       const management = new ManagementClient({
         domain: event.secrets.DOMAIN,
         clientId: event.secrets.CLIENT_ID,
         clientSecret: event.secrets.CLIENT_SECRET,
       });
       
       await management.updateAppMetadata(user.user_id, {
         first_login: new Date().toISOString(),
         onboarding_completed: false
       });
     }
   };
   ```

## 2.6 Local AI Setup (Ollama)

### Ollama Installation

1. **Install Ollama**
   ```bash
   # macOS
   brew install ollama
   
   # Linux
   curl -fsSL https://ollama.com/install.sh | sh
   
   # Windows (via WSL)
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. **Download and Configure Models**
   ```bash
   # Install recommended models
   ollama pull llama3.1:8b        # Main conversation model
   ollama pull mistral:7b         # Alternative model
   ollama pull codellama:7b       # Code analysis model
   ollama pull phi3:mini          # Lightweight model for quick responses
   
   # Verify installation
   ollama list
   ollama serve
   ```

3. **Custom Model Configuration**
   ```dockerfile
   # Modelfile for financial-specific model
   FROM llama3.1:8b
   
   TEMPLATE """{{ if .System }}<|im_start|>system
   {{ .System }}<|im_end|>
   {{ end }}{{ if .Prompt }}<|im_start|>user
   {{ .Prompt }}<|im_end|>
   {{ end }}<|im_start|>assistant
   """
   
   SYSTEM """You are a professional financial advisor with expertise in portfolio management, investment analysis, and personal finance. You provide clear, actionable advice based on modern portfolio theory and current market conditions. Always consider risk tolerance and investment timeline when making recommendations."""
   
   PARAMETER temperature 0.3
   PARAMETER top_p 0.9
   PARAMETER stop "<|im_start|>"
   PARAMETER stop "<|im_end|>"
   ```

   ```bash
   # Create custom model
   ollama create wealthwise-advisor -f ./Modelfile
   ```

### Testing AI Integration

```typescript
// src/services/aiService.ts
class AIService {
  private baseUrl = 'http://localhost:11434';
  
  async generateResponse(prompt: string, context?: any): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'wealthwise-advisor',
        prompt: this.buildFinancialPrompt(prompt, context),
        stream: false,
        options: {
          temperature: 0.3,
          top_p: 0.9,
          max_tokens: 1000
        }
      })
    });
    
    const data = await response.json();
    return data.response;
  }
  
  private buildFinancialPrompt(userQuestion: string, context: any): string {
    return `
Financial Context:
- Portfolio Value: $${context?.portfolioValue || 0}
- Risk Profile: ${context?.riskProfile || 'moderate'}
- Investment Goals: ${context?.goals?.map(g => g.title).join(', ') || 'Not specified'}

User Question: ${userQuestion}

Please provide specific, actionable financial advice based on this context.
    `;
  }
}
```

## 2.7 Development Scripts

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\" \"npm run dev:ml\"",
    "dev:frontend": "vite",
    "dev:backend": "cd server && npm run dev",
    "dev:ml": "cd ml-services && python -m uvicorn main:app --reload --port 8000",
    "build": "npm run build:frontend && npm run build:backend",
    "build:frontend": "tsc && vite build",
    "build:backend": "cd server && npm run build",
    "test": "npm run test:frontend && npm run test:backend",
    "test:frontend": "vitest",
    "test:backend": "cd server && npm run test",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview",
    "setup": "npm run setup:backend && npm run setup:ml && npm run setup:db",
    "setup:backend": "cd server && npm install",
    "setup:ml": "cd ml-services && pip install -r requirements.txt",
    "setup:db": "node scripts/setup-database.js"
  }
}
```

### Development Setup Script

```bash
#!/bin/bash
# scripts/setup-dev.sh

echo "Setting up WeathWise AI development environment..."

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "Python 3 is required but not installed. Aborting." >&2; exit 1; }
command -v ollama >/dev/null 2>&1 || { echo "Ollama is required but not installed. Aborting." >&2; exit 1; }

# Install frontend dependencies
echo "Installing frontend dependencies..."
npm install

# Setup backend
echo "Setting up backend..."
mkdir -p server
cd server
npm init -y
npm install express mongoose cors helmet morgan winston jsonwebtoken
npm install -D @types/node @types/express @types/cors typescript ts-node nodemon
cd ..

# Setup ML services
echo "Setting up ML services..."
mkdir -p ml-services
cd ml-services
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn pandas numpy scikit-learn tensorflow yfinance
cd ..

# Setup Ollama models
echo "Downloading AI models..."
ollama pull llama3.1:8b
ollama pull mistral:7b

# Create environment files
echo "Creating environment files..."
cp .env.example .env.local
cp server/.env.example server/.env

echo "Setup complete! Run 'npm run dev' to start development."
```

## 2.8 IDE Configuration

### VS Code Settings (.vscode/settings.json)
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "tailwindCSS.includeLanguages": {
    "typescript": "typescript",
    "typescriptreact": "typescriptreact"
  },
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}
```

### Launch Configuration (.vscode/launch.json)
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Frontend",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/src"
    },
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/server/src/index.ts",
      "outFiles": ["${workspaceFolder}/server/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

## Next Steps

Part 3 will cover detailed database design and MongoDB integration:
- Collection schemas and relationships
- Data encryption and security
- Performance optimization and indexing
- Backup and disaster recovery strategies
- Data migration and seeding scripts
