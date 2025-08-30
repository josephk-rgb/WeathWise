import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../src/utils/database';
import { DatabaseService } from '../src/services/DatabaseService';
import { logger } from '../src/utils/logger';

// Load environment variables
dotenv.config();

async function testUserModel() {
  const dbService = new DatabaseService();
  
  try {
    // Connect to database
    await connectDB();
    logger.info('Connected to database');

    // Test 1: Create a new user
    logger.info('Test 1: Creating a new user...');
    const newUser = await dbService.createUser({
      auth0Id: 'auth0|test1234567890123456789012',
      email: 'test@example.com',
      profile: {
        firstName: 'John',
        lastName: 'Doe'
      },
      preferences: {
        currency: 'USD',
        timezone: 'America/New_York',
        language: 'en',
        theme: 'auto',
        notifications: {
          email: true,
          push: true,
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
          riskTolerance: 7,
          completedAt: new Date()
        }
      },
      subscription: {
        plan: 'free',
        startDate: new Date(),
        features: ['basic_portfolio', 'market_data']
      }
    });

    logger.info('✅ User created successfully:', {
      id: newUser._id,
      email: newUser.email,
      fullName: (newUser as any).fullName,
      isSubscriptionActive: (newUser as any).isSubscriptionActive
    });

    // Test 2: Find user by Auth0 ID
    logger.info('Test 2: Finding user by Auth0 ID...');
    const foundUser = await dbService.findUserByAuth0Id('auth0|test1234567890123456789012');
    if (foundUser) {
      logger.info('✅ User found by Auth0 ID:', foundUser.email);
    } else {
      logger.error('❌ User not found by Auth0 ID');
    }

    // Test 3: Find user by email
    logger.info('Test 3: Finding user by email...');
    const userByEmail = await dbService.findUserByEmail('test@example.com');
    if (userByEmail) {
      logger.info('✅ User found by email:', userByEmail.email);
    } else {
      logger.error('❌ User not found by email');
    }

    // Test 4: Update user preferences
    logger.info('Test 4: Updating user preferences...');
    const updatedUser = await dbService.updateUserPreferences(
      (newUser._id as any).toString(),
      {
        theme: 'dark',
        notifications: {
          email: true,
          push: false,
          sms: true,
          trading: true,
          news: false
        }
      }
    );
    if (updatedUser) {
      logger.info('✅ User preferences updated:', {
        theme: updatedUser.preferences.theme,
        notifications: updatedUser.preferences.notifications
      });
    }

    // Test 5: Update risk profile
    logger.info('Test 5: Updating risk profile...');
    const riskUpdatedUser = await dbService.updateUserRiskProfile(
      (newUser._id as any).toString(),
      {
        level: 'aggressive',
        questionnaire: {
          age: 30,
          experience: 'advanced',
          timeline: 'long_term',
          riskTolerance: 9,
          completedAt: new Date()
        }
      }
    );
    if (riskUpdatedUser) {
      logger.info('✅ Risk profile updated:', {
        level: riskUpdatedUser.riskProfile.level,
        riskTolerance: riskUpdatedUser.riskProfile.questionnaire.riskTolerance
      });
    }

    // Test 6: Complete onboarding
    logger.info('Test 6: Completing onboarding...');
    const onboardingUser = await dbService.completeUserOnboarding((newUser._id as any).toString());
    if (onboardingUser) {
      logger.info('✅ Onboarding completed:', onboardingUser.metadata.onboardingCompleted);
    }

    // Test 7: Accept terms
    logger.info('Test 7: Accepting terms...');
    const termsUser = await dbService.acceptUserTerms((newUser._id as any).toString());
    if (termsUser) {
      logger.info('✅ Terms accepted:', {
        tosAccepted: !!termsUser.metadata.tosAcceptedAt,
        privacyAccepted: !!termsUser.metadata.privacyPolicyAcceptedAt
      });
    }

    // Test 8: Get user stats
    logger.info('Test 8: Getting user stats...');
    const stats = await dbService.getUserStats();
    logger.info('✅ User stats:', stats);

    // Test 9: Get all users with pagination
    logger.info('Test 9: Getting users with pagination...');
    const usersResult = await dbService.getUsers(1, 10);
    logger.info('✅ Users pagination:', {
      total: usersResult.total,
      page: usersResult.page,
      totalPages: usersResult.totalPages,
      usersCount: usersResult.users.length
    });

    // Test 10: Update last login
    logger.info('Test 10: Updating last login...');
    const loginUser = await dbService.updateUserLastLogin(
      (newUser._id as any).toString(),
      '192.168.1.1',
      'Mozilla/5.0 (Test Browser)'
    );
    if (loginUser) {
      logger.info('✅ Last login updated:', {
        lastLogin: loginUser.metadata.lastLogin,
        loginCount: loginUser.metadata.loginCount,
        ipAddress: loginUser.metadata.ipAddress
      });
    }

    // Test 11: Clean up - Delete test user
    logger.info('Test 11: Cleaning up - Deleting test user...');
    const deleted = await dbService.deleteUser((newUser._id as any).toString());
    if (deleted) {
      logger.info('✅ Test user deleted successfully');
    } else {
      logger.error('❌ Failed to delete test user');
    }

    logger.info('🎉 All tests completed successfully!');

  } catch (error) {
    logger.error('❌ Test failed:', error);
  } finally {
    // Disconnect from database
    await disconnectDB();
    logger.info('Disconnected from database');
    process.exit(0);
  }
}

// Run the test
testUserModel();
