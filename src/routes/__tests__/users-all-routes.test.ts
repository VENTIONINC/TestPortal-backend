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

const users: PrismaUser[] = [];
let idCounter = 1;

// Mock Cognito auth service
jest.mock('@/services/authService', () => ({
  signUpUser: jest.fn(() => Promise.resolve({ user: { Username: 'test-cognito-user' } })),
  signInUser: jest.fn(() => Promise.resolve({ 
    status: 'SUCCESS',
    session: { 
      getAccessToken: () => ({ getJwtToken: () => 'mock-token' }),
      getIdToken: () => ({ getJwtToken: () => 'mock-id-token' })
    }
  })),
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

beforeEach(() => {
  users.length = 0;
  idCounter = 1;
  jest.clearAllMocks();
});

describe('users routes', () => {
  it('POST /signup creates a user', async () => {
    const res = await request(app)
      .post('/api/v2/users/signup')
      .send({ name: 'Alice', email: 'alice@ventionteams.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe('alice@ventionteams.com');
  });

  it('POST /login authenticates user', async () => {
    await request(app)
      .post('/api/v2/users/signup')
      .send({ name: 'Bob', email: 'bob@ventionteams.com', password: 'password123' });

    const res = await request(app)
      .post('/api/v2/users/login')
      .send({ email: 'bob@ventionteams.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
  });

  it('GET /:userId returns user when authorized', async () => {
    await request(app)
      .post('/api/v2/users/signup')
      .send({ name: 'Carol', email: 'carol@ventionteams.com', password: 'password123' });

    const loginRes = await request(app)
      .post('/api/v2/users/login')
      .send({ email: 'carol@ventionteams.com', password: 'password123' });
    const token = loginRes.body.accessToken;
    const userId = loginRes.body.user.id;

    const unauthRes = await request(app).get(`/api/v2/users/${userId}`);
    expect(unauthRes.status).toBe(401);

    const res = await request(app)
      .get(`/api/v2/users/${userId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('carol@ventionteams.com');
  });

  it('POST /refresh-token issues new tokens', async () => {
    await request(app)
      .post('/api/v2/users/signup')
      .send({ name: 'Dave', email: 'dave@ventionteams.com', password: 'password123' });

    const loginRes = await request(app)
      .post('/api/v2/users/login')
      .send({ email: 'dave@ventionteams.com', password: 'password123' });
    const { refreshToken } = loginRes.body;

    const res = await request(app)
      .post('/api/v2/users/refresh-token')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
  });

  it('PATCH /:userId updates user data', async () => {
    await request(app)
      .post('/api/v2/users/signup')
      .send({ name: 'Eve', email: 'eve@ventionteams.com', password: 'password123' });

    const loginRes = await request(app)
      .post('/api/v2/users/login')
      .send({ email: 'eve@ventionteams.com', password: 'password123' });
    const token = loginRes.body.accessToken;
    const userId = loginRes.body.user.id;

    const unauthRes = await request(app)
      .patch(`/api/v2/users/${userId}`)
      .send({ name: 'NewEve' });
    expect(unauthRes.status).toBe(401);

    const res = await request(app)
      .patch(`/api/v2/users/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'NewEve' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('NewEve');
  });
});
