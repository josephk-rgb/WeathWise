import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/utils/database';

describe('Database Connection', () => {
  it('should connect to MongoDB successfully', async () => {
    await connectDB();
    
    expect(mongoose.connection.readyState).toBe(1); // 1 = connected
    
    await disconnectDB();
  });

  it('should disconnect from MongoDB successfully', async () => {
    await connectDB();
    await disconnectDB();
    
    expect(mongoose.connection.readyState).toBe(0); // 0 = disconnected
  });
});
