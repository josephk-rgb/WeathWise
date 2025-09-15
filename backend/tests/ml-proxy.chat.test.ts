import express, { Request, Response } from 'express';
import request from 'supertest';

// Mock environment
process.env.ML_SERVICES_URL = 'http://ml-services:8000';

// Capture axios calls
const axiosPostMock = jest.fn();
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: (...args: any[]) => axiosPostMock(...args),
    get: jest.fn(),
  },
}));

// Helper to build an app mounting the router under /ml-proxy
const buildApp = async () => {
  const app = express();
  app.use(express.json());
  const router = (await import('../src/routes/ml-proxy')).default;
  app.use('/ml-proxy', router);
  // simple auth test endpoint to confirm setup
  app.get('/healthz', (_: Request, res: Response) => res.json({ ok: true }));
  return app;
};

describe('ml-proxy chat', () => {
  beforeEach(() => {
    jest.resetModules();
    axiosPostMock.mockReset();
  });

  test('forwards Authorization and user_id to ML services', async () => {
    // Mock auth middleware to inject a valid user
    jest.doMock('../src/middleware/auth', () => ({
      authMiddleware: (_req: Request, _res: Response, next: Function) => next(),
    }));

    // Mock isAuthenticatedUser to accept our user shape
    jest.doMock('../src/routes/ml-proxy', () => jest.requireActual('../src/routes/ml-proxy'));

    const app = await buildApp();

    const token = 'test.jwt.token';
    // Inject user by patching request in supertest via set header and mock of req.user using a tiny wrapper route
    // Since the route relies on req.user set by authMiddleware, redefine mock to set req.user
    jest.resetModules();
    jest.doMock('../src/middleware/auth', () => ({
      authMiddleware: (req: any, _res: any, next: any) => {
        req.user = { id: 'user_123', email: 'user@test.com', auth0Id: 'auth0|abc' };
        next();
      },
    }));

    const app2 = await buildApp();

    // Mock ML response
    axiosPostMock.mockResolvedValueOnce({ data: { response: 'ok', confidence: 0.9, sources: [], session_id: 's1', processing_time_ms: 10 } });

    const res = await request(app2)
      .post('/ml-proxy/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Hello', model: 'llama3.1:8b', include_financial_data: true });

    expect(res.status).toBe(200);
    expect(axiosPostMock).toHaveBeenCalledTimes(1);
    const [url, payload, options] = axiosPostMock.mock.calls[0];
    expect(url).toMatch(/\/ai\/chat$/);
    // payload contains message, model, include_financial_data and user_id
    expect(payload).toMatchObject({ message: 'Hello', model: 'llama3.1:8b', include_financial_data: true, user_id: 'user_123' });
    // Header forwards Authorization
    expect(options.headers.Authorization).toBe(`Bearer ${token}`);
  });

  test('returns 401 when unauthenticated', async () => {
    // Mock auth to NOT set req.user
    jest.doMock('../src/middleware/auth', () => ({
      authMiddleware: (_req: Request, _res: Response, next: Function) => next(),
    }));

    const app = await buildApp();

    const res = await request(app)
      .post('/ml-proxy/chat')
      .send({ message: 'Hello' });

    expect(res.status).toBe(401);
    expect(axiosPostMock).not.toHaveBeenCalled();
  });
});


