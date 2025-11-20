import '@/test-utils/testEnv';
import { jest } from '@jest/globals';
import type { PrismaUser } from '@/types';
import { userController } from '@/controllers/userController';
import { executeController, executeProtectedController } from '@/test-utils/httpMocks';

interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
}

const users: PrismaUser[] = [];
const generateUserId = () => crypto.randomUUID();
let shouldThrowDatabaseError = false;
let databaseErrorMessage = 'Database error';

jest.mock('@/models/userModel', () => ({
  userModel: {
    findById: jest.fn((id: string) => {
      if (shouldThrowDatabaseError) {
        throw new Error(databaseErrorMessage);
      }
      const user = users.find((u) => u.id === id);
      return Promise.resolve(user ?? null);
    }),
    findByEmail: jest.fn((email: string) => {
      if (shouldThrowDatabaseError) {
        throw new Error(databaseErrorMessage);
      }
      const user = users.find((u) => u.email === email);
      return Promise.resolve(user ?? null);
    }),
    create: jest.fn((data: CreateUserData) => {
      if (shouldThrowDatabaseError) {
        throw new Error(databaseErrorMessage);
      }
      const user: PrismaUser = {
        id: generateUserId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        cognitoUserId: null,
        mcpToken: null,
        reportPortalUrl: null,
        reportPortalEnabled: false,
        monitoringPortalUrl: null,
        monitoringPortalEnabled: false,
        analyzeEnabled: false,
      };
      users.push(user);
      return Promise.resolve(user);
    }),
    update: jest.fn((id: string, data: Partial<CreateUserData>) => {
      if (shouldThrowDatabaseError) {
        throw new Error(databaseErrorMessage);
      }
      const user = users.find((u) => u.id === id);
      if (!user) throw new Error('User not found');
      Object.assign(user, data, { updatedAt: new Date() });
      return Promise.resolve(user);
    }),
  },
}));

describe('Users Route - Business Logic Tests', () => {
  const signup = async () =>
    executeController(userController.signup, {
      method: 'POST',
      body: { name: 'Test User', email: 'test@ventionteams.com', password: 'password123' },
    });

  const login = async () =>
    executeController(userController.login, {
      method: 'POST',
      body: { email: 'test@ventionteams.com', password: 'password123' },
    });

  beforeEach(() => {
    users.length = 0;
    shouldThrowDatabaseError = false;
    databaseErrorMessage = 'Database error';
    jest.clearAllMocks();
  });

  describe('Input Validation Requirements', () => {
    it('should require user data for signup', async () => {
      const res = await executeController(userController.signup, { method: 'POST' });

      expect(res.statusCode).toBe(400);
      const body = res.body as any;
      expect(body?.error).toBe('User data is required');
    });

    it('should require login credentials', async () => {
      const res = await executeController(userController.login, { method: 'POST' });

      expect(res.statusCode).toBe(400);
      const body = res.body as any;
      expect(body?.error).toBe('Login data is required');
    });

    it('should require update data for user updates', async () => {
      await signup();
      const loginRes = await login();
      const loginBody = loginRes.body as any;
      const { accessToken, user } = loginBody;

      const res = await executeProtectedController(userController.updateUser, {
        method: 'PATCH',
        params: { userId: String(user.id) },
        token: accessToken,
      });

      expect(res.statusCode).toBe(400);
      const body = res.body as any;
      expect(body?.error).toBe('Update data is required');
    });

    it('should reject empty update data', async () => {
      await signup();
      const loginRes = await login();
      const loginBody = loginRes.body as any;
      const { accessToken, user } = loginBody;

      const res = await executeProtectedController(userController.updateUser, {
        method: 'PATCH',
        params: { userId: String(user.id) },
        token: accessToken,
        body: {},
      });

      expect(res.statusCode).toBe(400);
      const body = res.body as any;
      expect(body?.error).toBe('Update data is required');
    });

    it('should require refresh token for token refresh', async () => {
      const res = await executeController(userController.refreshToken, {
        method: 'POST',
      });

      expect(res.statusCode).toBe(401);
      const body = res.body as any;
      expect(body?.error).toContain("Cannot destructure property 'refreshToken'");
    });

    it('should reject empty refresh token', async () => {
      const res = await executeController(userController.refreshToken, {
        method: 'POST',
        body: { refreshToken: '' },
      });

      expect(res.statusCode).toBe(400);
      const body = res.body as any;
      expect(body?.error).toBe('Refresh token is required');
    });
  });

  describe('Database Error Handling', () => {
    it('should handle database errors during user lookup', async () => {
      await signup();
      const loginRes = await login();
      const { accessToken } = loginRes.body as any;

      shouldThrowDatabaseError = true;
      databaseErrorMessage = 'User not found';

      const res = await executeProtectedController(userController.getUserById, {
        method: 'GET',
        params: { userId: '999' },
        token: accessToken,
      });

      expect(res.statusCode).toBe(401);
      const body = res.body as any;
      expect(body?.error).toBe('User not found');
    });

    it('should handle database errors during signup', async () => {
      shouldThrowDatabaseError = true;
      databaseErrorMessage = 'Create failed';

      const res = await executeController(userController.signup, {
        method: 'POST',
        body: { name: 'Error', email: 'error@ventionteams.com', password: 'password123' },
      });

      expect(res.statusCode).toBe(400);
      const body = res.body as any;
      expect(body?.error).toBe('Create failed');
    });
  });
});
