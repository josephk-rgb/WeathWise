import { connectDB, disconnectDB } from '../src/utils/database';
import { User } from '../src/models/User';

describe('Simple User Model', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    // Clean up the users collection before each test
    await User.deleteMany({});
  });

  it('should create a new user with basic data', async () => {
    const userData = {
      auth0Id: 'auth0|test1234567890123456789012',
      email: 'test@example.com',
      profile: {
        firstName: 'John',
        lastName: 'Doe'
      }
    };

    const user = new User(userData);
    const savedUser = await user.save();

    expect(savedUser).toBeDefined();
    expect(savedUser.email).toBe('test@example.com');
    expect(savedUser.profile.firstName).toBe('John');
    expect(savedUser.profile.lastName).toBe('Doe');
    expect(savedUser.preferences.currency).toBe('USD'); // Default value
    expect(savedUser.riskProfile.level).toBe('moderate'); // Default value
    expect(savedUser.subscription.plan).toBe('free'); // Default value
  });

  it('should find user by email', async () => {
    const userData = {
      auth0Id: 'auth0|find1234567890123456789012',
      email: 'find@example.com',
      profile: {
        firstName: 'Find',
        lastName: 'User'
      }
    };

    await new User(userData).save();

    const foundUser = await User.findOne({ email: 'find@example.com' });
    
    expect(foundUser).toBeDefined();
    expect(foundUser?.email).toBe('find@example.com');
  });

  it('should update user preferences', async () => {
    const userData = {
      auth0Id: 'auth0|update1234567890123456789012',
      email: 'update@example.com',
      profile: {
        firstName: 'Update',
        lastName: 'User'
      }
    };

    const user = await new User(userData).save();

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        'preferences.theme': 'dark',
        'preferences.notifications.email': false
      },
      { new: true }
    );

    expect(updatedUser).toBeDefined();
    expect(updatedUser?.preferences.theme).toBe('dark');
    expect(updatedUser?.preferences.notifications.email).toBe(false);
  });

  it('should delete user', async () => {
    const userData = {
      auth0Id: 'auth0|delete1234567890123456789012',
      email: 'delete@example.com',
      profile: {
        firstName: 'Delete',
        lastName: 'User'
      }
    };

    const user = await new User(userData).save();
    const userId = user._id;

    await User.findByIdAndDelete(userId);

    const deletedUser = await User.findById(userId);
    expect(deletedUser).toBeNull();
  });

  it('should reject duplicate Auth0 ID', async () => {
    const userData1 = {
      auth0Id: 'auth0|duplicate1234567890123456789012',
      email: 'user1@example.com',
      profile: {
        firstName: 'User1',
        lastName: 'Test'
      }
    };

    const userData2 = {
      auth0Id: 'auth0|duplicate1234567890123456789012', // Same Auth0 ID
      email: 'user2@example.com',
      profile: {
        firstName: 'User2',
        lastName: 'Test'
      }
    };

    await new User(userData1).save();

    // This should fail due to duplicate Auth0 ID
    await expect(new User(userData2).save()).rejects.toThrow();
  });

  it('should reject duplicate email', async () => {
    const userData1 = {
      auth0Id: 'auth0|email11234567890123456789012',
      email: 'duplicate@example.com',
      profile: {
        firstName: 'User1',
        lastName: 'Test'
      }
    };

    const userData2 = {
      auth0Id: 'auth0|email21234567890123456789012',
      email: 'duplicate@example.com', // Same email
      profile: {
        firstName: 'User2',
        lastName: 'Test'
      }
    };

    await new User(userData1).save();

    // This should fail due to duplicate email
    await expect(new User(userData2).save()).rejects.toThrow();
  });

  it('should convert email to lowercase', async () => {
    const userData = {
      auth0Id: 'auth0|lowercase1234567890123456789012',
      email: 'UPPERCASE@EXAMPLE.COM',
      profile: {
        firstName: 'Test',
        lastName: 'User'
      }
    };

    const user = await new User(userData).save();
    expect(user.email).toBe('uppercase@example.com');
  });

  it('should validate required fields', async () => {
    const invalidUserData = {
      // Missing required fields
      email: 'test@example.com'
      // Missing auth0Id and profile
    };

    await expect(new User(invalidUserData).save()).rejects.toThrow();
  });
});
