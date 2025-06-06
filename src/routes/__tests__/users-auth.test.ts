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

// simple in-memory user store to mock prisma model
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

import usersRouter from '../users';

const app = express();
app.use(express.json());
app.use('/api', usersRouter);

describe('users auth flow', () => {
  it('allows signup, login and protected access', async () => {
    const signupRes = await request(app)
      .post('/api/v2/users/signup')
      .send({ name: 'Test', email: 'test@example.com', password: 'password123' });
    expect(signupRes.status).toBe(201);

    const loginRes = await request(app)
      .post('/api/v2/users/login')
      .send({ email: 'test@example.com', password: 'password123' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty('accessToken');
    expect(loginRes.body).toHaveProperty('refreshToken');

    const userId = loginRes.body.user.id;
    const token = loginRes.body.accessToken;

    const unauthRes = await request(app).get(`/api/v2/users/${userId}`);
    expect(unauthRes.status).toBe(401);

    const authRes = await request(app)
      .get(`/api/v2/users/${userId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(authRes.status).toBe(200);
    expect(authRes.body.email).toBe('test@example.com');
  });
});
