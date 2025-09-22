import { DatabaseService } from '../src/services/DatabaseService';
import mongoose from 'mongoose';

const databaseService = new DatabaseService();

describe('Profile Completion Functionality', () => {
  beforeAll(async () => {
    // Use existing connection or skip if not connected
    if (mongoose.connection.readyState !== 1) {
      console.log('Skipping tests - no database connection');
      return;
    }
  });

  afterAll(async () => {
    // Don't disconnect as other tests might be using it
  });

  beforeEach(async () => {
    if (mongoose.connection.readyState !== 1) return;
    
    // Clean up test data
    await mongoose.connection.db?.collection('users').deleteMany({ 
      email: 'test-profile@example.com' 
    });
  });

  describe('Database Profile Update', () => {
    it('should successfully update user profile and mark onboarding as completed', async () => {
      if (mongoose.connection.readyState !== 1) {
        console.log('Skipping test - no database connection');
        return;
      }

      // Create test user
      const testUser = await databaseService.createUser({
        auth0Id: 'auth0|test-profile-123',
        email: 'test-profile@example.com',
        profile: {
          firstName: 'Test',
          lastName: 'User'
        },
        preferences: {
          currency: 'USD',
          timezone: 'America/New_York',
          language: 'en',
          theme: 'auto' as const,
          notifications: {
            email: true,
            push: true,
            sms: false,
            trading: true,
            news: true
          }
        },
        riskProfile: {
          level: 'moderate' as const,
          questionnaire: {
            age: 30,
            experience: 'beginner',
            timeline: '5-10 years',
            riskTolerance: 5,
            completedAt: new Date()
          }
        },
        subscription: {
          plan: 'free' as const,
          startDate: new Date(),
          features: ['basic_portfolio', 'ai_chat']
        },
        encryption: {
          keyId: 'default',
          algorithm: 'AES-256-GCM',
          version: 1
        },
        metadata: {
          lastLogin: new Date(),
          loginCount: 1,
          onboardingCompleted: false
        }
      });

      // Verify user was created with onboarding not completed
      expect(testUser.metadata.onboardingCompleted).toBe(false);

      // Update profile using the corrected pattern
      const updateData = {
        profile: {
          ...testUser.profile,
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1234567890'
        },
        metadata: {
          ...testUser.metadata,
          onboardingCompleted: true
        }
      };

      const updatedUser = await databaseService.updateUser(testUser._id.toString(), updateData);

      // Verify the update worked
      expect(updatedUser).toBeTruthy();
      expect(updatedUser?.profile.firstName).toBe('John');
      expect(updatedUser?.profile.lastName).toBe('Doe');
      expect(updatedUser?.profile.phone).toBe('+1234567890');
      expect(updatedUser?.metadata.onboardingCompleted).toBe(true);

      // Verify original metadata is preserved
      expect(updatedUser?.metadata.loginCount).toBe(1);
    });

    it('should preserve existing profile data when partially updating', async () => {
      if (mongoose.connection.readyState !== 1) {
        console.log('Skipping test - no database connection');
        return;
      }

      // Create test user with some profile data
      const testUser = await databaseService.createUser({
        auth0Id: 'auth0|test-partial-123',
        email: 'test-partial@example.com',
        profile: {
          firstName: 'Original',
          lastName: 'Name'
        },
        preferences: {
          currency: 'USD',
          timezone: 'America/New_York',
          language: 'en',
          theme: 'auto' as const,
          notifications: {
            email: true,
            push: true,
            sms: false,
            trading: true,
            news: true
          }
        },
        riskProfile: {
          level: 'moderate' as const,
          questionnaire: {
            age: 30,
            experience: 'beginner',
            timeline: '5-10 years',
            riskTolerance: 5,
            completedAt: new Date()
          }
        },
        subscription: {
          plan: 'free' as const,
          startDate: new Date(),
          features: ['basic_portfolio', 'ai_chat']
        },
        encryption: {
          keyId: 'default',
          algorithm: 'AES-256-GCM',
          version: 1
        },
        metadata: {
          lastLogin: new Date(),
          loginCount: 5,
          onboardingCompleted: false
        }
      });

      // First update - only firstName
      const firstUpdate = {
        profile: {
          ...testUser.profile,
          firstName: 'John'
        },
        metadata: {
          ...testUser.metadata,
          onboardingCompleted: true
        }
      };

      await databaseService.updateUser(testUser._id.toString(), firstUpdate);

      // Get the user to verify
      const afterFirstUpdate = await databaseService.findUserById(testUser._id.toString());
      expect(afterFirstUpdate?.profile.firstName).toBe('John');
      expect(afterFirstUpdate?.profile.lastName).toBe('Name'); // Should be preserved
      expect(afterFirstUpdate?.metadata.onboardingCompleted).toBe(true);
      expect(afterFirstUpdate?.metadata.loginCount).toBe(5); // Should be preserved

      // Second update - only add phone, preserve everything else
      const secondUpdate = {
        profile: {
          ...afterFirstUpdate!.profile,
          phone: '+1234567890'
        },
        metadata: afterFirstUpdate!.metadata
      };

      const finalUser = await databaseService.updateUser(testUser._id.toString(), secondUpdate);

      // Verify all data is preserved
      expect(finalUser?.profile.firstName).toBe('John');
      expect(finalUser?.profile.lastName).toBe('Name');
      expect(finalUser?.profile.phone).toBe('+1234567890');
      expect(finalUser?.metadata.onboardingCompleted).toBe(true);
      expect(finalUser?.metadata.loginCount).toBe(5);
    });
  });
});

describe('Profile Completion API', () => {
  beforeAll(async () => {
    // Use existing database connection if available
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wealthwise-test');
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    // Clean up test data
    await mongoose.connection.db?.collection('users').deleteMany({ 
      email: 'test@example.com' 
    });
    
    // Create test user
    await databaseService.createUser({
      auth0Id: 'auth0|test123',
      email: 'test@example.com',
      profile: {
        firstName: 'Test',
        lastName: 'User'
      },
      preferences: {
        currency: 'USD',
        timezone: 'America/New_York',
        language: 'en',
        theme: 'auto' as const,
        notifications: {
          email: true,
          push: true,
          sms: false,
          trading: true,
          news: true
        }
      },
      riskProfile: {
        level: 'moderate' as const,
        questionnaire: {
          age: 30,
          experience: 'beginner',
          timeline: '5-10 years',
          riskTolerance: 5,
          completedAt: new Date()
        }
      },
      subscription: {
        plan: 'free' as const,
        startDate: new Date(),
        features: ['basic_portfolio', 'ai_chat']
      },
      encryption: {
        keyId: 'default',
        algorithm: 'AES-256-GCM',
        version: 1
      },
      metadata: {
        lastLogin: new Date(),
        loginCount: 1,
        onboardingCompleted: false
      }
    });
  });

  describe('PUT /auth/complete-profile', () => {
    it('should successfully complete profile and mark onboarding as completed', async () => {
      const profileData = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        dateOfBirth: '1990-01-01'
      };

      const response = await request(app)
        .put('/auth/complete-profile')
        .set('Authorization', mockAuthToken)
        .send(profileData)
        .expect(200);

      expect(response.body.message).toBe('Profile completed successfully');
      expect(response.body.user.profile.firstName).toBe('John');
      expect(response.body.user.profile.lastName).toBe('Doe');
      expect(response.body.user.metadata.onboardingCompleted).toBe(true);

      // Verify in database
      const user = await databaseService.findUserByEmail('test@example.com');
      expect(user?.metadata.onboardingCompleted).toBe(true);
      expect(user?.profile.firstName).toBe('John');
      expect(user?.profile.lastName).toBe('Doe');
    });

    it('should preserve existing profile data when updating', async () => {
      // First update profile partially
      await request(app)
        .put('/auth/complete-profile')
        .set('Authorization', mockAuthToken)
        .send({ firstName: 'John' })
        .expect(200);

      // Then update other fields
      await request(app)
        .put('/auth/complete-profile')
        .set('Authorization', mockAuthToken)
        .send({ lastName: 'Doe', phone: '+1234567890' })
        .expect(200);

      // Verify all data is preserved
      const user = await databaseService.findUserByEmail('test@example.com');
      expect(user?.profile.firstName).toBe('John');
      expect(user?.profile.lastName).toBe('Doe');
      expect(user?.profile.phone).toBe('+1234567890');
      expect(user?.metadata.onboardingCompleted).toBe(true);
    });

    it('should mark onboarding as completed even with no profile data', async () => {
      const response = await request(app)
        .put('/auth/complete-profile')
        .set('Authorization', mockAuthToken)
        .send({})
        .expect(200);

      expect(response.body.message).toBe('Profile completed successfully');
      expect(response.body.user.metadata.onboardingCompleted).toBe(true);

      // Verify in database
      const user = await databaseService.findUserByEmail('test@example.com');
      expect(user?.metadata.onboardingCompleted).toBe(true);
    });
  });

  describe('POST /auth/complete-onboarding', () => {
    it('should successfully mark onboarding as completed', async () => {
      const response = await request(app)
        .post('/auth/complete-onboarding')
        .set('Authorization', mockAuthToken)
        .expect(200);

      expect(response.body.message).toBe('Onboarding completed successfully');
      expect(response.body.onboardingCompleted).toBe(true);

      // Verify in database
      const user = await databaseService.findUserByEmail('test@example.com');
      expect(user?.metadata.onboardingCompleted).toBe(true);
    });

    it('should preserve existing metadata when completing onboarding', async () => {
      // Get initial metadata
      const initialUser = await databaseService.findUserByEmail('test@example.com');
      const initialLoginCount = initialUser?.metadata.loginCount;

      await request(app)
        .post('/auth/complete-onboarding')
        .set('Authorization', mockAuthToken)
        .expect(200);

      // Verify metadata is preserved
      const user = await databaseService.findUserByEmail('test@example.com');
      expect(user?.metadata.onboardingCompleted).toBe(true);
      expect(user?.metadata.loginCount).toBe(initialLoginCount);
    });
  });
});
