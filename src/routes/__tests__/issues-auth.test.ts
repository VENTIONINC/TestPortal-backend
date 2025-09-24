import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import type { PrismaUser, PrismaIssue } from '@/types';

process.env.JWT_SECRET = 'test-secret';

// in-memory stores
const users: PrismaUser[] = [];
let userIdCounter = 1;
const issues: PrismaIssue[] = [];
let issueIdCounter = 1;

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
    create: jest.fn((data: { name: string; email: string; passwordHash: string }) => {
      const user: PrismaUser = {
        id: userIdCounter++,
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
    update: jest.fn((id: number | string, data: Partial<{ name: string; email: string; passwordHash: string }>) => {
      const user = users.find((u) => u.id === Number(id));
      if (!user) throw new Error('User not found');
      Object.assign(user, data, { updatedAt: new Date() });
      return Promise.resolve(user);
    }),
  },
}));

jest.mock('@/models/issueModel', () => ({
  issueModel: {
    findMany: jest.fn(() => Promise.resolve(issues)),
    findById: jest.fn((id: number | string) => {
      const issue = issues.find((i) => i.id === Number(id));
      return Promise.resolve(issue ?? null);
    }),
    create: jest.fn((data: Partial<PrismaIssue>) => {
      const issue: PrismaIssue = {
        id: issueIdCounter++,
        createdAt: new Date(),
        updatedAt: new Date(),
        name: data.name as string,
        category: data.category as string,
        description: data.description ?? null,
        portal: data.portal ?? null,
        service: data.service ?? null,
        ticket: data.ticket ?? null,
        projectId: data.projectId || "test-project-uuid",
        createdById: data.createdById ?? null,
        updatedById: data.updatedById ?? null,
      };
      issues.push(issue);
      return Promise.resolve(issue);
    }),
    update: jest.fn((id: number | string, data: Partial<PrismaIssue>) => {
      const issue = issues.find((i) => i.id === Number(id));
      if (!issue) throw new Error('Issue not found');
      Object.assign(issue, data, { updatedAt: new Date() });
      return Promise.resolve(issue);
    }),
  },
}));

import usersRouter from '../users';
import issuesRouter from '../issue';

const app = express();
app.use(express.json());
app.use('/api', usersRouter);
app.use('/api', issuesRouter);

describe('v2 issues auth flow', () => {
  it('requires auth for creating issues and sets user references', async () => {
    const signupRes = await request(app)
      .post('/api/v2/users/signup')
      .send({ name: 'Test', email: 'test2@example.com', password: 'password123' });
    expect(signupRes.status).toBe(201);

    const loginRes = await request(app)
      .post('/api/v2/users/login')
      .send({ email: 'test2@example.com', password: 'password123' });
    const token = loginRes.body.accessToken;
    const userId = loginRes.body.user.id;

    const unauthRes = await request(app)
      .post('/api/v2/issues')
      .send({ name: 'Issue1', category: 'bug' });
    expect(unauthRes.status).toBe(401);

    const authRes = await request(app)
      .post('/api/v2/issues')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Issue1', category: 'bug' });
    expect(authRes.status).toBe(201);
    expect(authRes.body.createdById).toBe(userId);
    expect(authRes.body.updatedById).toBe(userId);
  });
});
