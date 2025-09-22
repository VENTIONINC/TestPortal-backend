import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import type { PrismaUser } from '@/types';

interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
}

process.env.JWT_SECRET = 'test-secret';

// in-memory user store for mocking
const users: PrismaUser[] = [];
let idCounter = 1;

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

import { Router } from "express";
import { userController } from "@/controllers/userController";
import { authMiddleware } from "@/middleware/authMiddleware";

// Create test-specific router with regular auth instead of Cognito
const testRouter = Router();
testRouter.post("/v2/users/signup", userController.signup);
testRouter.post("/v2/users/login", userController.login);
testRouter.post("/v2/users/refresh-token", userController.refreshToken);
testRouter.get("/v2/users/:userId", authMiddleware, userController.getUserById);
testRouter.patch("/v2/users/:userId", authMiddleware, userController.updateUser);
testRouter.patch("/v2/users/:userId/integrations", authMiddleware, userController.updateUserIntegrations);

const app = express();
app.use(express.json());
app.use('/api', testRouter);

describe('users route additional flows', () => {
  beforeEach(() => {
    users.length = 0;
    idCounter = 1;
    jest.clearAllMocks();
  });

  it('refreshes tokens using /refresh-token', async () => {
    await request(app)
      .post('/api/v2/users/signup')
      .send({ name: 'Test', email: 'test@ventionteams.com', password: 'password123' });

    const loginRes = await request(app)
      .post('/api/v2/users/login')
      .send({ email: 'test@ventionteams.com', password: 'password123' });
    const { refreshToken } = loginRes.body;

    const refreshRes = await request(app)
      .post('/api/v2/users/refresh-token')
      .send({ refreshToken });
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body).toHaveProperty('accessToken');
    expect(refreshRes.body).toHaveProperty('refreshToken');
  });

  it('updates user data via PATCH', async () => {
    await request(app)
      .post('/api/v2/users/signup')
      .send({ name: 'Test', email: 'test@ventionteams.com', password: 'password123' });
    const loginRes = await request(app)
      .post('/api/v2/users/login')
      .send({ email: 'test@ventionteams.com', password: 'password123' });
    const userId = loginRes.body.user.id;
    const token = loginRes.body.accessToken;

    const patchResUnauth = await request(app)
      .patch(`/api/v2/users/${userId}`)
      .send({ name: 'Updated' });
    expect(patchResUnauth.status).toBe(401);

    const patchRes = await request(app)
      .patch(`/api/v2/users/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.name).toBe('Updated');
  });
});
