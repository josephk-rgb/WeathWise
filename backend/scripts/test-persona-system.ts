import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { PersonaDataLoader } from '../src/services/persona/PersonaDataLoader';
import { HistoricalDataGenerator } from '../src/services/persona/HistoricalDataGenerator';
import { PersonaDataValidator } from '../src/services/persona/PersonaDataValidator';
import { DailySnapshotService } from '../src/services/snapshot/DailySnapshotService';
import { SnapshotScheduler } from '../src/services/snapshot/SnapshotScheduler';
import { NetWorthCalculator } from '../src/services/netWorthCalculator';
import { 
  User, 
  Account, 
  Investment, 
  NetWorthMilestone, 
  Transaction, 
  Debt, 
  Budget, 
  Goal, 
  PhysicalAsset,
  AccountBalanceHistory,
  DailyPrice
} from '../src/models';
import { logger } from '../src/utils/logger';

// Load environment variables
dotenv.config();

/**
 * Comprehensive Test Script for Persona-Based Mock Data System
 * 
 * This script tests all components of the persona system including:
 * - Persona data loading
 * - Historical data generation
 * - Data validation
 * - Net worth calculations
 * - Snapshot system
 */

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  details?: any;
  errors?: string[];
}

class PersonaSystemTester {
  private testResults: TestResult[] = [];
  private testUserId: mongoose.Types.ObjectId | null = null;

  /**
   * Run all persona system tests
   */
  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Comprehensive Persona System Tests');
    console.log('=' .repeat(60));

    try {
      // Setup
      await this.setupTestEnvironment();

      // Core Tests
      await this.testPersonaDataLoading();
      await this.testHistoricalDataGeneration();
      await this.testDataValidation();
      await this.testNetWorthCalculations();
      await this.testSnapshotSystem();

      // Integration Tests
      await this.testEndToEndWorkflow();
      await this.testPerformanceMetrics();

      // Cleanup
      await this.cleanupTestData();

      // Report Results
      this.generateTestReport();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  /**
   * Setup test environment
   */
  private async setupTestEnvironment(): Promise<void> {
    console.log('\n🔧 Setting up test environment...');
    
    try {
      // Check if MONGODB_URI is available
      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        console.log('⚠️  MONGODB_URI not found in environment variables');
        console.log('   Using fallback: mongodb://localhost:27017/weathwise');
      } else {
        console.log('✅ MONGODB_URI found in environment variables');
      }
      
      // Connect to database
      if (mongoose.connection.readyState === 0) {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(mongoUri || 'mongodb://localhost:27017/weathwise');
        console.log('✅ Connected to MongoDB successfully');
      } else {
        console.log('✅ Already connected to MongoDB');
      }

      // Clean up any existing test user first
      await User.deleteMany({ 
        email: { $regex: /test-persona@weathwise\.com/ }
      });
      console.log('🧹 Cleaned up any existing test users');

      // Create test user with unique ID
      const testRunId = Date.now();
      const testUser = new User({
        auth0Id: `auth0|testpersonauser${testRunId}`,
        email: 'test-persona@weathwise.com',
        role: 'user',
        profile: {
          firstName: 'Test',
          lastName: 'User'
        },
        preferences: {
          currency: 'USD',
          timezone: 'America/New_York',
          language: 'en',
          theme: 'light',
          notifications: {
            email: true,
            push: false,
            sms: false,
            trading: true,
            news: true
          }
        },
        riskProfile: {
          level: 'moderate',
          questionnaire: {
            age: 30,
            experience: 'intermediate',
            timeline: 'long_term',
            riskTolerance: 6,
            completedAt: new Date()
          }
        },
        subscription: {
          plan: 'free',
          startDate: new Date()
        },
        encryption: {
          keyVersion: 1,
          encryptedKey: 'test-encrypted-key'
        },
        metadata: {
          onboardingCompleted: true,
          loginCount: 1,
          lastLoginAt: new Date()
        }
      });

      await testUser.save();
      this.testUserId = testUser._id as mongoose.Types.ObjectId;
      
      console.log(`✅ Test user created: ${this.testUserId}`);
    } catch (error) {
      throw new Error(`Failed to setup test environment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test persona data loading
   */
  private async testPersonaDataLoading(): Promise<void> {
    console.log('\n📊 Testing Persona Data Loading...');
    
    const startTime = Date.now();
    
    try {
      if (!this.testUserId) throw new Error('Test user not available');

      // Test loading Sarah Chen persona
      const result = await PersonaDataLoader.loadPersonaData(
        this.testUserId,
        'sarah-chen',
        {
          clearExistingData: true,
          generateHistoricalData: true,
          batchSize: 1000,
          validateData: true
        }
      );

      const duration = Date.now() - startTime;
      
      this.testResults.push({
        testName: 'Persona Data Loading',
        success: result.success,
        duration,
        details: {
          personaName: result.personaName,
          recordsCreated: result.recordsCreated,
          errors: result.errors
        },
        errors: result.success ? [] : result.errors
      });

      if (result.success) {
        console.log(`✅ Persona data loaded successfully`);
        console.log(`   📊 Records created: ${JSON.stringify(result.recordsCreated, null, 2)}`);
        console.log(`   ⏱️ Duration: ${duration}ms`);
      } else {
        console.log(`❌ Persona data loading failed: ${result.errors.join(', ')}`);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      this.testResults.push({
        testName: 'Persona Data Loading',
        success: false,
        duration,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
      
      console.log(`❌ Persona data loading test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test historical data generation
   */
  private async testHistoricalDataGeneration(): Promise<void> {
    console.log('\n📈 Testing Historical Data Generation...');
    
    const startTime = Date.now();
    
    try {
      if (!this.testUserId) throw new Error('Test user not available');

      const result = await HistoricalDataGenerator.generateHistoricalDataForUser(
        this.testUserId,
        {
          startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
          endDate: new Date(),
          accountBalanceGranularity: 'daily',
          investmentPriceGranularity: 'daily',
          netWorthSnapshotFrequency: 'daily',
          includeMarketVolatility: true,
          includeSeasonalVariations: true,
          generateTransactionHistory: false
        }
      );

      const duration = Date.now() - startTime;
      
      this.testResults.push({
        testName: 'Historical Data Generation',
        success: true,
        duration,
        details: {
          accountBalanceHistory: result.accountBalanceHistory,
          investmentPriceHistory: result.investmentPriceHistory,
          netWorthMilestones: result.netWorthMilestones,
          errors: result.errors
        }
      });

      console.log(`✅ Historical data generated successfully`);
      console.log(`   📊 Account balance records: ${result.accountBalanceHistory.totalRecords}`);
      console.log(`   📈 Investment price records: ${result.investmentPriceHistory.totalRecords}`);
      console.log(`   📸 Net worth milestones: ${result.netWorthMilestones.totalRecords}`);
      console.log(`   ⏱️ Duration: ${duration}ms`);

    } catch (error) {
      const duration = Date.now() - startTime;
      this.testResults.push({
        testName: 'Historical Data Generation',
        success: false,
        duration,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
      
      console.log(`❌ Historical data generation test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test data validation
   */
  private async testDataValidation(): Promise<void> {
    console.log('\n🔍 Testing Data Validation...');
    
    const startTime = Date.now();
    
    try {
      if (!this.testUserId) throw new Error('Test user not available');

      const result = await PersonaDataValidator.validatePersonaData(this.testUserId, {
        validateAccountBalances: true,
        validateInvestmentData: true,
        validateDebtConsistency: true,
        validateNetWorthCalculations: true,
        validateHistoricalData: true,
        validateTransactionPatterns: true,
        validateGoalProgress: true,
        validateBudgetConsistency: true,
        strictMode: false
      });

      const duration = Date.now() - startTime;
      
      this.testResults.push({
        testName: 'Data Validation',
        success: result.isValid,
        duration,
        details: {
          score: result.score,
          issues: result.issues,
          warnings: result.warnings,
          summary: result.summary
        },
        errors: result.isValid ? [] : result.issues.map(issue => issue.message)
      });

      console.log(`✅ Data validation completed`);
      console.log(`   📊 Score: ${result.score}/100`);
      console.log(`   ⚠️ Issues: ${result.issues.length}`);
      console.log(`   ⚠️ Warnings: ${result.warnings.length}`);
      console.log(`   ⏱️ Duration: ${duration}ms`);

      if (result.issues.length > 0) {
        console.log(`   🔍 Issues found:`);
        result.issues.forEach((issue, index) => {
          console.log(`      ${index + 1}. [${issue.severity}] ${issue.message}`);
        });
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      this.testResults.push({
        testName: 'Data Validation',
        success: false,
        duration,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
      
      console.log(`❌ Data validation test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test net worth calculations
   */
  private async testNetWorthCalculations(): Promise<void> {
    console.log('\n💰 Testing Net Worth Calculations...');
    
    const startTime = Date.now();
    
    try {
      if (!this.testUserId) throw new Error('Test user not available');

      const netWorth = await NetWorthCalculator.getCurrentNetWorth(this.testUserId);
      const netWorthByCategory = await NetWorthCalculator.getNetWorthByCategory(this.testUserId);

      const duration = Date.now() - startTime;
      
      this.testResults.push({
        testName: 'Net Worth Calculations',
        success: true,
        duration,
        details: {
          netWorth: netWorth.netWorth,
          breakdown: netWorth.breakdown,
          categories: netWorthByCategory
        }
      });

      console.log(`✅ Net worth calculations completed`);
      console.log(`   💰 Total Net Worth: $${netWorth.netWorth.toLocaleString()}`);
      console.log(`   📊 Breakdown:`);
      console.log(`      💵 Liquid Assets: $${netWorth.breakdown.liquidAssets.toLocaleString()}`);
      console.log(`      📈 Portfolio Value: $${netWorth.breakdown.portfolioValue.toLocaleString()}`);
      console.log(`      🏠 Physical Assets: $${netWorth.breakdown.physicalAssets.toLocaleString()}`);
      console.log(`      💳 Total Liabilities: $${netWorth.breakdown.totalLiabilities.toLocaleString()}`);
      console.log(`   ⏱️ Duration: ${duration}ms`);

    } catch (error) {
      const duration = Date.now() - startTime;
      this.testResults.push({
        testName: 'Net Worth Calculations',
        success: false,
        duration,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
      
      console.log(`❌ Net worth calculations test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test snapshot system
   */
  private async testSnapshotSystem(): Promise<void> {
    console.log('\n📸 Testing Snapshot System...');
    
    const startTime = Date.now();
    
    try {
      if (!this.testUserId) throw new Error('Test user not available');

      // Test manual snapshot creation
      const snapshotResult = await DailySnapshotService.createDailySnapshotForUser(this.testUserId);
      
      // Test snapshot statistics
      const stats = await DailySnapshotService.getSnapshotStatistics();
      
      // Test scheduler status
      const schedulerStatus = SnapshotScheduler.getStatus();

      const duration = Date.now() - startTime;
      
      this.testResults.push({
        testName: 'Snapshot System',
        success: snapshotResult.success,
        duration,
        details: {
          snapshotCreated: snapshotResult.success,
          snapshotId: snapshotResult.snapshotId,
          statistics: stats,
          schedulerStatus
        },
        errors: snapshotResult.success ? [] : [snapshotResult.error || 'Unknown error']
      });

      console.log(`✅ Snapshot system test completed`);
      console.log(`   📸 Snapshot created: ${snapshotResult.success ? 'Yes' : 'No'}`);
      console.log(`   📊 Total snapshots: ${stats.totalSnapshots}`);
      console.log(`   📅 Snapshots today: ${stats.snapshotsToday}`);
      console.log(`   ⚙️ Scheduler initialized: ${schedulerStatus.isInitialized}`);
      console.log(`   ⏱️ Duration: ${duration}ms`);

    } catch (error) {
      const duration = Date.now() - startTime;
      this.testResults.push({
        testName: 'Snapshot System',
        success: false,
        duration,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
      
      console.log(`❌ Snapshot system test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test end-to-end workflow
   */
  private async testEndToEndWorkflow(): Promise<void> {
    console.log('\n🔄 Testing End-to-End Workflow...');
    
    const startTime = Date.now();
    
    try {
      if (!this.testUserId) throw new Error('Test user not available');

      // Test loading different personas
      const personas = ['sarah-chen', 'marcus-johnson', 'elena-rodriguez'];
      const results: Array<{ persona: string; success: boolean }> = [];

      for (const persona of personas) {
        const result = await PersonaDataLoader.loadPersonaData(
          this.testUserId,
          persona,
          {
            clearExistingData: true,
            generateHistoricalData: false, // Skip for speed
            batchSize: 1000,
            validateData: false // Skip for speed
          }
        );
        results.push({ persona, success: result.success });
      }

      const duration = Date.now() - startTime;
      
      this.testResults.push({
        testName: 'End-to-End Workflow',
        success: results.every(r => r.success),
        duration,
        details: {
          personasTested: results,
          totalPersonas: personas.length,
          successfulLoads: results.filter(r => r.success).length
        }
      });

      console.log(`✅ End-to-end workflow test completed`);
      console.log(`   👥 Personas tested: ${personas.length}`);
      console.log(`   ✅ Successful loads: ${results.filter(r => r.success).length}`);
      console.log(`   ⏱️ Duration: ${duration}ms`);

    } catch (error) {
      const duration = Date.now() - startTime;
      this.testResults.push({
        testName: 'End-to-End Workflow',
        success: false,
        duration,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
      
      console.log(`❌ End-to-end workflow test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test performance metrics
   */
  private async testPerformanceMetrics(): Promise<void> {
    console.log('\n⚡ Testing Performance Metrics...');
    
    const startTime = Date.now();
    
    try {
      if (!this.testUserId) throw new Error('Test user not available');

      // Test database query performance
      const queryStart = Date.now();
      const accounts = await Account.find({ userId: this.testUserId });
      const investments = await Investment.find({ userId: this.testUserId });
      const milestones = await NetWorthMilestone.find({ userId: this.testUserId });
      const queryDuration = Date.now() - queryStart;

      // Test bulk operations
      const bulkStart = Date.now();
      const recordCounts = {
        accounts: await Account.countDocuments({ userId: this.testUserId }),
        investments: await Investment.countDocuments({ userId: this.testUserId }),
        milestones: await NetWorthMilestone.countDocuments({ userId: this.testUserId })
      };
      const bulkDuration = Date.now() - bulkStart;

      const duration = Date.now() - startTime;
      
      this.testResults.push({
        testName: 'Performance Metrics',
        success: true,
        duration,
        details: {
          queryPerformance: {
            duration: queryDuration,
            accountsFound: accounts.length,
            investmentsFound: investments.length,
            milestonesFound: milestones.length
          },
          bulkOperationPerformance: {
            duration: bulkDuration,
            recordCounts
          }
        }
      });

      console.log(`✅ Performance metrics test completed`);
      console.log(`   🔍 Query performance: ${queryDuration}ms`);
      console.log(`   📊 Bulk operations: ${bulkDuration}ms`);
      console.log(`   📈 Total records: ${Object.values(recordCounts).reduce((sum, count) => sum + count, 0)}`);
      console.log(`   ⏱️ Duration: ${duration}ms`);

    } catch (error) {
      const duration = Date.now() - startTime;
      this.testResults.push({
        testName: 'Performance Metrics',
        success: false,
        duration,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
      
      console.log(`❌ Performance metrics test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cleanup test data
   */
  private async cleanupTestData(): Promise<void> {
    console.log('\n🧹 Cleaning up test data...');
    
    try {
      if (this.testUserId) {
        // Delete test user and all related data
        await User.findByIdAndDelete(this.testUserId);
        console.log(`✅ Test user deleted: ${this.testUserId}`);
      }
      
      console.log(`✅ Test cleanup completed`);
    } catch (error) {
      console.log(`⚠️ Test cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate test report
   */
  private generateTestReport(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 PERSONA SYSTEM TEST REPORT');
    console.log('='.repeat(60));

    const totalTests = this.testResults.length;
    const successfulTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - successfulTests;
    const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0);

    console.log(`\n📈 SUMMARY:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Successful: ${successfulTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   ⏱️ Total Duration: ${totalDuration}ms`);
    console.log(`   📊 Success Rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);

    console.log(`\n📋 DETAILED RESULTS:`);
    this.testResults.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${index + 1}. ${status} ${result.testName}`);
      console.log(`      Duration: ${result.duration}ms`);
      
      if (result.errors && result.errors.length > 0) {
        console.log(`      Errors: ${result.errors.join(', ')}`);
      }
      
      if (result.details) {
        console.log(`      Details: ${JSON.stringify(result.details, null, 6).replace(/\n/g, '\n      ')}`);
      }
    });

    console.log('\n' + '='.repeat(60));
    
    if (failedTests === 0) {
      console.log('🎉 ALL TESTS PASSED! Persona system is ready for production.');
    } else {
      console.log(`⚠️ ${failedTests} test(s) failed. Please review the errors above.`);
    }
    
    console.log('='.repeat(60));
  }

  /**
   * Cleanup test environment
   */
  public async cleanup(): Promise<void> {
    try {
      console.log('\n🧹 Cleaning up test data...');
      
      // Clean up any test users and related data
      const testUsers = await User.find({ 
        email: { $regex: /test-persona@weathwise\.com/ }
      });
      
      for (const user of testUsers) {
        const userId = user._id;
        
        // Clean up all related data
        await Promise.all([
          Account.deleteMany({ userId }),
          Investment.deleteMany({ userId }),
          NetWorthMilestone.deleteMany({ userId }),
          Transaction.deleteMany({ userId }),
          Debt.deleteMany({ userId }),
          Budget.deleteMany({ userId }),
          Goal.deleteMany({ userId }),
          PhysicalAsset.deleteMany({ userId }),
          AccountBalanceHistory.deleteMany({ userId }),
          // DailyPrice doesn't have userId, so we'll clean it separately if needed
        ]);
        
        // Delete the user
        await User.findByIdAndDelete(userId);
      }
      
      console.log(`✅ Cleaned up ${testUsers.length} test user(s) and related data`);
      
      // Close database connection
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
      }
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new PersonaSystemTester();
  tester.runAllTests()
    .then(async () => {
      console.log('\n🏁 Test suite completed');
      await tester.cleanup();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('\n💥 Test suite failed:', error);
      await tester.cleanup();
      process.exit(1);
    });
}

export default PersonaSystemTester;
