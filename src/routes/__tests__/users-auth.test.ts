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
let idCounter = 1;

jest.mock('@/services/authService', () => ({
  signUpUser: jest.fn(() => Promise.resolve({ user: { Username: 'test-cognito-user' } })),
  signInUser: jest.fn(() =>
    Promise.resolve({
      status: 'SUCCESS',
      session: {
        getAccessToken: () => ({ getJwtToken: () => 'mock-token' }),
        getIdToken: () => ({ getJwtToken: () => 'mock-id-token' }),
      },
    }),
  ),
  signOutUser: jest.fn(() => Promise.resolve('User signed out successfully')),
}));

jest.mock('@/models/userModel', () => ({
  userModel: {
    findById: jest.fn((id: number | string) => {
      const user = users.find((u) => u.id === Number(id));
      return Promise.resolve(user ?? null);
    }),
    findByEmail: jest.fn((email: string) => {
      const user = users.find((u) => u.email === email);
      return Promise.resolve(user ?? null);
    }),
    findByCognitoUserId: jest.fn((cognitoUserId: string) => {
      const user = users.find((u) => u.cognitoUserId === cognitoUserId);
      return Promise.resolve(user ?? null);
    }),
    create: jest.fn((data: CreateUserData) => {
      const user: PrismaUser = {
        id: idCounter++,
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
      };
      users.push(user);
      return Promise.resolve(user);
    }),
    update: jest.fn((id: number | string, data: Partial<CreateUserData>) => {
      const user = users.find((u) => u.id === Number(id));
      if (!user) throw new Error('User not found');
      Object.assign(user, data, { updatedAt: new Date() });
      return Promise.resolve(user);
    }),
  },
}));

describe('users auth flow', () => {
  beforeEach(() => {
    users.length = 0;
    idCounter = 1;
    jest.clearAllMocks();
  });

  it('allows signup, login and protected access', async () => {
    const signupRes = await executeController(userController.signup, {
      method: 'POST',
      body: { name: 'Test', email: 'test@ventionteams.com', password: 'password123' },
    });
    expect(signupRes.statusCode).toBe(201);

    const loginRes = await executeController(userController.login, {
      method: 'POST',
      body: { email: 'test@ventionteams.com', password: 'password123' },
    });
    expect(loginRes.statusCode).toBe(200);
    const loginBody = loginRes.body as any;
    expect(loginBody).toHaveProperty('accessToken');
    expect(loginBody).toHaveProperty('refreshToken');

    const userId = String(loginBody.user.id);
    const token = loginBody.accessToken as string;

    const unauthRes = await executeProtectedController(userController.getUserById, {
      method: 'GET',
      params: { userId },
    });
    expect(unauthRes.statusCode).toBe(401);

    const authRes = await executeProtectedController(userController.getUserById, {
      method: 'GET',
      params: { userId },
      token,
    });
    expect(authRes.statusCode).toBe(200);
    const authBody = authRes.body as any;
    expect(authBody?.email).toBe('test@ventionteams.com');
  });
});
