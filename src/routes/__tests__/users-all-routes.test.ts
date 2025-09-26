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

describe('users routes', () => {
  beforeEach(() => {
    users.length = 0;
    idCounter = 1;
    jest.clearAllMocks();
  });

  const signup = async (name: string, email: string) =>
    executeController(userController.signup, {
      method: 'POST',
      body: { name, email, password: 'password123' },
    });

  const login = async (email: string) =>
    executeController(userController.login, {
      method: 'POST',
      body: { email, password: 'password123' },
    });

  it('POST /signup creates a user', async () => {
    const res = await signup('Alice', 'alice@ventionteams.com');
    expect(res.statusCode).toBe(201);
    const body = res.body as any;
    expect(body?.email).toBe('alice@ventionteams.com');
  });

  it('POST /login authenticates user', async () => {
    await signup('Bob', 'bob@ventionteams.com');

    const res = await login('bob@ventionteams.com');

    expect(res.statusCode).toBe(200);
    const body = res.body as any;
    expect(body).toHaveProperty('accessToken');
    expect(body).toHaveProperty('refreshToken');
  });

  it('GET /:userId returns user when authorized', async () => {
    await signup('Carol', 'carol@ventionteams.com');

    const loginRes = await login('carol@ventionteams.com');
    const loginBody = loginRes.body as any;
    const token = loginBody.accessToken as string;
    const userId = String(loginBody.user.id);

    const unauthRes = await executeProtectedController(userController.getUserById, {
      method: 'GET',
      params: { userId },
    });
    expect(unauthRes.statusCode).toBe(401);

    const res = await executeProtectedController(userController.getUserById, {
      method: 'GET',
      params: { userId },
      token,
    });

    expect(res.statusCode).toBe(200);
    const body = res.body as any;
    expect(body?.email).toBe('carol@ventionteams.com');
  });

  it('POST /refresh-token issues new tokens', async () => {
    await signup('Dave', 'dave@ventionteams.com');

    const loginRes = await login('dave@ventionteams.com');
    const loginBody = loginRes.body as any;
    const { refreshToken } = loginBody;

    const res = await executeController(userController.refreshToken, {
      method: 'POST',
      body: { refreshToken },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
  });

  it('PATCH /:userId updates user data', async () => {
    await signup('Eve', 'eve@ventionteams.com');

    const loginRes = await login('eve@ventionteams.com');
    const loginBody = loginRes.body as any;
    const token = loginBody.accessToken as string;
    const userId = String(loginBody.user.id);

    const unauthRes = await executeProtectedController(userController.updateUser, {
      method: 'PATCH',
      params: { userId },
      body: { name: 'NewEve' },
    });
    expect(unauthRes.statusCode).toBe(401);

    const res = await executeProtectedController(userController.updateUser, {
      method: 'PATCH',
      params: { userId },
      body: { name: 'NewEve' },
      token,
    });

    expect(res.statusCode).toBe(200);
    const body = res.body as any;
    expect(body?.name).toBe('NewEve');
  });
});
