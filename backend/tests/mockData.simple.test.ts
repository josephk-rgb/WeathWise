import request from 'supertest';
import app from '../src/index';

describe('Mock Data API - Simple Tests', () => {
  
  describe('GET /api/mock-data/config', () => {
    it('should return default configuration', async () => {
      const response = await request(app)
        .get('/api/mock-data/config');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accounts');
      expect(response.body).toHaveProperty('transactions');
      expect(response.body).toHaveProperty('investments');
    });
  });

  describe('POST /api/mock-data/generate', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/mock-data/generate')
        .send({ accounts: 3 });
      
      // Should return 401 or 403 (unauthorized/forbidden)
      expect([401, 403]).toContain(response.status);
    });

    it('should validate request body structure', async () => {
      const response = await request(app)
        .post('/api/mock-data/generate')
        .set('Authorization', 'Bearer fake-token')
        .send({ invalidField: 'test' });
      
      // Should handle invalid input gracefully
      expect([400, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/mock-data/summary', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/mock-data/summary');
      
      expect([401, 403]).toContain(response.status);
    });
  });

  describe('DELETE /api/mock-data/clear', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/mock-data/clear');
      
      expect([401, 403]).toContain(response.status);
    });
  });

});
