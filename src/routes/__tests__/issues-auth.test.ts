import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import type { PrismaUser, PrismaIssue } from "@/types";
import { userController } from "@/controllers/userController";
import { issueController } from "@/controllers/issueController";
import {
  executeController,
  executeProtectedController,
} from "@/test-utils/httpMocks";

const users: PrismaUser[] = [];
const issues: PrismaIssue[] = [];

const generateUserId = () => crypto.randomUUID();
const generateIssueId = () => crypto.randomUUID();

jest.mock("@/models/userModel", () => ({
  userModel: {
    findById: jest.fn((id: string) => {
      const user = users.find((u) => u.id === id);
      return Promise.resolve(user ?? null);
    }),
    findByEmail: jest.fn((email: string) => {
      const user = users.find((u) => u.email === email);
      return Promise.resolve(user ?? null);
    }),
    create: jest.fn(
      (data: { name: string; email: string; passwordHash: string }) => {
        const user: PrismaUser = {
          id: generateUserId(),
          createdAt: new Date(),
          updatedAt: new Date(),
          name: data.name,
          email: data.email,
          passwordHash: data.passwordHash,
          cognitoUserId: null,
          mcpToken: null,
          analyzeEnabled: false,
          reportPortalUrl: null,
          reportPortalEnabled: false,
          monitoringPortalUrl: null,
          monitoringPortalEnabled: false,
        };
        users.push(user);
        return Promise.resolve(user);
      },
    ),
    update: jest.fn(
      (
        id: string,
        data: Partial<{ name: string; email: string; passwordHash: string }>,
      ) => {
        const user = users.find((u) => u.id === id);
        if (!user) throw new Error("User not found");
        Object.assign(user, data, { updatedAt: new Date() });
        return Promise.resolve(user);
      },
    ),
  },
}));

jest.mock("@/models/issueModel", () => ({
  issueModel: {
    findMany: jest.fn(() => Promise.resolve(issues)),
    findById: jest.fn((id: string) => {
      const issue = issues.find((i) => i.id === id);
      return Promise.resolve(issue ?? null);
    }),
    create: jest.fn((data: Partial<PrismaIssue>) => {
      const issue: PrismaIssue = {
        id: generateIssueId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        name: data.name as string,
        category: data.category as string,
        description: data.description ?? null,
        portal: data.portal ?? null,
        service: data.service ?? null,
        ticket: data.ticket ?? null,
        projectId: data.projectId ?? "test-project-uuid",
        createdById: data.createdById ?? null,
        updatedById: data.updatedById ?? null,
      };
      issues.push(issue);
      return Promise.resolve(issue);
    }),
    update: jest.fn((id: string, data: Partial<PrismaIssue>) => {
      const issue = issues.find((i) => i.id === id);
      if (!issue) throw new Error("Issue not found");
      Object.assign(issue, data, { updatedAt: new Date() });
      return Promise.resolve(issue);
    }),
  },
}));

describe("v2 issues auth flow", () => {
  beforeEach(() => {
    users.length = 0;
    issues.length = 0;
    jest.clearAllMocks();
  });

  const signup = async () =>
    executeController(userController.signup, {
      method: "POST",
      body: {
        name: "Test",
        email: "test2@ventionteams.com",
        password: "password123",
      },
    });

  const login = async () =>
    executeController(userController.login, {
      method: "POST",
      body: { email: "test2@ventionteams.com", password: "password123" },
    });

  it("requires auth for creating issues and sets user references", async () => {
    const signupRes = await signup();
    expect(signupRes.statusCode).toBe(201);

    const loginRes = await login();
    const loginBody = loginRes.body;
    const token = loginBody.accessToken as string;
    const userId = loginBody.user.id as string;

    const unauthRes = await executeProtectedController(
      issueController.createIssue,
      {
        method: "POST",
        body: { name: "Issue1", category: "bug" },
      },
    );
    expect(unauthRes.statusCode).toBe(401);

    const authRes = await executeProtectedController(
      issueController.createIssue,
      {
        method: "POST",
        body: { name: "Issue1", category: "bug" },
        token,
      },
    );
    expect(authRes.statusCode).toBe(201);
    const authBody = authRes.body;
    expect(authBody?.createdById).toBe(userId);
    expect(authBody?.updatedById).toBe(userId);
  });
});
