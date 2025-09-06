# Admin User & Mock Data Implementation TODO

## Overview
Implement a simplified admin user system with a role field and mock data generation capability accessible through a settings page button for admin users only.

## Phase 1: Admin User Role System

### 1.1 User Model Enhancement
- [x] **Add Role Field to User Model**
  - [x] Add `role` field to User schema (`'user' | 'admin'`)
  - [x] Set default role to 'user' for new users
  - [x] Add validation for role field
  - [x] Create migration script to add role field to existing users

### 1.2 Frontend Role Checking
- [x] **Settings Page Admin Controls**
  - [x] Add role check in frontend to show admin-only features
  - [x] Create "Generate Mock Data" button in settings (admin only)
  - [x] Add loading state for mock data generation
  - [x] Display success/error messages for data generation

## Phase 2: Mock Data Generation System

### 2.1 Mock Data API Endpoint
- [x] **Create Mock Data Generation Endpoint**
  - [x] Create `/api/mock-data/generate` POST endpoint
  - [x] Add role validation middleware (admin only)
  - [x] Implement request body validation for generation parameters
  - [x] Add response with generation status and summary

### 2.2 Mock Data Generators
- [x] **Admin Account Population**
  - [x] Populate admin user's profile with realistic data if incomplete
  - [x] Update admin user's financial background and preferences
  - [x] Set realistic subscription plan and risk profile

- [x] **Financial Account Mock Data**
  - [x] Generate 3-5 accounts for the admin user (checking, savings, credit, investment, retirement, loan)
  - [x] Create realistic account balances and limits for admin's accounts
  - [x] Generate account numbers (fake but valid format) for admin's accounts
  - [x] Set various account statuses (active, closed, pending) for admin's accounts
  - [x] Link all accounts to admin user's ID

- [x] **Transaction Mock Data Generator**
  - [x] Create realistic transaction patterns for admin's accounts
  - [x] Generate varied transaction categories for admin (groceries, utilities, entertainment)
  - [x] Implement seasonal spending patterns in admin's transaction history
  - [x] Create merchant data with realistic names for admin's transactions
  - [x] Generate transaction descriptions and metadata for admin's spending
  - [x] Implement different payment methods for admin's transactions
  - [x] Link all transactions to admin's specific accounts

- [x] **Investment Mock Data Generator**
  - [x] Create diverse portfolio composition for admin user
  - [x] Generate stock, bond, ETF holdings for admin's investment accounts
  - [x] Implement realistic price movements and returns for admin's investments
  - [x] Create investment transaction history for admin user
  - [x] Generate dividend and interest payments for admin's portfolio
  - [x] Link all investments to admin user's investment accounts

- [x] **Budget & Goal Mock Data**
  - [x] Generate realistic budget categories and amounts for admin user
  - [x] Create varied savings goals for admin (emergency fund, vacation, home)
  - [x] Implement budget adherence patterns for admin's spending history
  - [x] Generate recurring budget items for admin user
  - [x] Create goal achievement timelines and progress for admin user
  - [x] Link budgets and goals to admin user ID

- [x] **Debt Mock Data Generator**
  - [x] Create various debt types for admin user (credit card, student loan, mortgage)
  - [x] Generate realistic interest rates and payment schedules for admin's debts
  - [x] Implement debt payoff strategies for admin user
  - [x] Create debt consolidation scenarios for admin's financial profile
  - [x] Link all debts to admin user ID

### 2.3 Data Generation Configuration
- [x] **Simple Configuration Options**
  - [x] Number of months of transaction history for admin account (default: 12)
  - [x] Number of accounts to create for admin user (default: 3-5 accounts)
  - [x] Account types to include for admin (checking, savings, credit, investment, retirement, loan)
  - [x] Include investments for admin account (boolean toggle)
  - [x] Include budgets and goals for admin user (boolean toggle)
  - [x] Number of transactions per month for admin (default: 50-100)
  - [x] Include debt accounts for admin user (boolean toggle)

### 2.4 Data Relationship Management
- [x] **Relational Data Integrity**
  - [x] Link all generated accounts to the admin user
  - [x] Link transactions to admin user's accounts
  - [x] Connect investments to admin user's portfolio
  - [x] Maintain budget-transaction relationships for admin user
  - [x] Ensure goal-account linkages for admin user

- [x] **Data Consistency**
  - [x] Implement balance calculations validation for admin accounts
  - [x] Ensure transaction dates align with admin account creation
  - [x] Validate admin investment portfolios match account values

## Implementation Files to Create/Modify

### New Files
- [x] `src/services/MockDataService.ts` - Core mock data generation service
- [x] `src/services/generators/AccountMockGenerator.ts` - Account mock data for admin
- [x] `src/services/generators/TransactionMockGenerator.ts` - Transaction mock data for admin
- [x] `src/services/generators/InvestmentMockGenerator.ts` - Investment mock data for admin
- [x] `src/services/generators/BudgetMockGenerator.ts` - Budget mock data for admin
- [x] `src/services/generators/GoalMockGenerator.ts` - Goal mock data for admin
- [x] `src/services/generators/DebtMockGenerator.ts` - Debt mock data for admin
- [x] `src/utils/MockDataHelpers.ts` - Utility functions for data generation
- [x] `src/routes/mockData.ts` - Mock data API routes
- [x] `src/controllers/mockDataController.ts` - Mock data business logic
- [x] `src/middleware/adminOnly.ts` - Simple admin role validation middleware
- [x] `scripts/test-mock-data.ts` - Backend integration test for mock data generation
- [x] `frontend/src/services/mockDataService.ts` - Frontend service for mock data API
- [x] `frontend/src/components/Admin/AdminMockData.tsx` - Admin mock data component
- [x] `frontend/src/test/components/AdminMockData.test.tsx` - Frontend component tests

### Files to Modify
- [x] `src/models/User.ts` - Add role field
- [x] `src/routes/index.ts` - Add mock data routes
- [x] `package.json` - Add faker.js dependency
- [x] `frontend/src/types/index.ts` - Add role field and mock data types
- [x] `frontend/src/contexts/UserContext.tsx` - Add role field to user profile
- [x] `frontend/src/pages/Settings.tsx` - Add admin mock data section

## Dependencies to Add
- [x] `@faker-js/faker` - For realistic fake data generation
- [x] `chance` - Additional random data generation

## Frontend Integration (Settings Page)
- [x] Add admin role check in settings page
- [x] Create "Generate Mock Data" button (admin only)
- [x] Add configuration form for generation parameters
- [x] Implement API call to mock data endpoint
- [x] Add loading states and progress indicators
- [x] Display success/error messages

## Testing Strategy
- [x] Unit tests for all mock data generators
- [x] Integration test for mock data API endpoint
- [x] Test role-based access to mock data generation (admin only)
- [x] Data integrity validation tests for admin account population
- [x] Performance test with generated datasets for single admin user
- [x] Test that mock data only affects admin user, not other users

## Success Criteria
- [x] Admin users can access mock data generation in settings
- [x] System populates ONLY the admin user's account with realistic, varied financial data
- [x] Generated data maintains referential integrity within admin user's account
- [x] Non-admin users cannot access mock data generation
- [x] Frontend provides clear feedback during generation process
- [x] Mock data generation does not affect any other users in the system
- [x] Admin can generate data multiple times (clears previous mock data before generating new)
