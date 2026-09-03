// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import argon2 from "argon2";
import type { Response } from "express";
import type { PrismaUser } from "@/types";
import { userController } from "@/controllers/userController";
import {
  authMiddleware,
  requireRole,
  type AuthenticatedRequest,
} from "@/middleware/authMiddleware";
import {
  executeController,
  executeProtectedController,
  createMockRequest,
  createMockResponse,
} from "@/test-utils/httpMocks";

jest.mock("@/prisma/client", () => ({
  dbClient: {
    $transaction: jest.fn(
      async (callback: (tx: object) => Promise<unknown>) => await callback({}),
    ),
  },
}));

interface CreateUserData {
  name: string;
  email: string;
  passwordHash?: string;
  status?: PrismaUser["status"];
  role?: PrismaUser["role"];
}

const users: PrismaUser[] = [];
const generateUserId = () => crypto.randomUUID();
let shouldThrowDatabaseError = false;
let databaseErrorMessage = "Database error";
const mockTx = {};

jest.mock("argon2");
jest.mock("@/prisma/client", () => ({
  dbClient: {
    $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback({})),
  },
}));

jest.mock("@/services/authService", () => ({
  signUpUser: jest.fn(() =>
    Promise.resolve({ user: { Username: "test-cognito-user" } }),
  ),
  signInUser: jest.fn(() =>
    Promise.resolve({
      status: "SUCCESS",
      session: {
        getAccessToken: () => ({ getJwtToken: () => "mock-token" }),
        getIdToken: () => ({ getJwtToken: () => "mock-id-token" }),
      },
    }),
  ),
  signOutUser: jest.fn(() => Promise.resolve("User signed out successfully")),
}));

jest.mock("@/prisma/client", () => ({
  dbClient: {
    $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
      callback(mockTx),
    ),
  },
}));

jest.mock("@/models/userModel", () => ({
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
    findByCognitoUserId: jest.fn((cognitoUserId: string) => {
      const user = users.find((u) => u.cognitoUserId === cognitoUserId);
      return Promise.resolve(user ?? null);
    }),
    list: jest.fn(() => Promise.resolve([...users])),
    countActiveAdmins: jest.fn(() =>
      Promise.resolve(
        users.filter((user) => user.status === "active" && user.role === "admin")
          .length,
      ),
    ),
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
        status: data.status ?? "active",
        role: data.role ?? "member",
        passwordHash: data.passwordHash ?? null,
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
      if (!user) throw new Error("User not found");
      Object.assign(user, data, { updatedAt: new Date() });
      return Promise.resolve(user);
    }),
  },
}));

describe("Users Routes", () => {
  const executeAdminProtectedController = async <
    T = unknown,
    P extends Record<string, string> = Record<string, string>,
  >(
    controller: (req: AuthenticatedRequest<P>, res: Response) => Promise<void>,
    options: {
      method?: string;
      params?: P;
      body?: unknown;
      token?: string;
    } = {},
  ) => {
    const requestOptions = {
      ...(options.method ? { method: options.method } : {}),
      ...(options.params ? { params: options.params } : {}),
      ...(options.body !== undefined ? { body: options.body } : {}),
      ...(options.token
        ? {
            headers: {
              authorization: `Bearer ${options.token}`,
            },
          }
        : {}),
    };
    const req = createMockRequest(requestOptions) as AuthenticatedRequest<P>;
    const res = createMockResponse<T>();

    let controllerPromise: Promise<void> | undefined;

    await authMiddleware(req, res, () => {
      requireRole("admin")(req, res, () => {
        controllerPromise = controller(req, res);
      });
    });

    if (controllerPromise) {
      await controllerPromise;
    }

    return res;
  };

  beforeEach(() => {
    users.length = 0;
    shouldThrowDatabaseError = false;
    databaseErrorMessage = "Database error";
    process.env.MCP_SECRET = "test-mcp-secret";
    jest.clearAllMocks();
    (argon2.hash as jest.MockedFunction<typeof argon2.hash>).mockResolvedValue(
      "hashed_password",
    );
    (argon2.verify as jest.MockedFunction<typeof argon2.verify>).mockImplementation(
      async (hash) => hash === "hashed_password",
    );
  });

  describe("Authentication Flow", () => {
    it("returns auth configuration for the active provider", async () => {
      const res = await executeController(userController.getAuthConfig);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        provider: "local",
        capabilities: {
          passwordLogin: true,
          passwordSignup: true,
          requiresRedirectLogin: false,
          supportsNewPasswordChallenge: false,
          signupRequiresApproval: true,
        },
      });
    });

    it("allows signup, login and protected access", async () => {
      const signupRes = await executeController(userController.authSignup, {
        method: "POST",
        body: {
          name: "Test",
          email: "test@ventionteams.com",
          password: "password123",
        },
      });
      expect(signupRes.statusCode).toBe(201);
      expect(signupRes.body).toMatchObject({
        user: {
          email: "test@ventionteams.com",
          status: "pending",
          role: "member",
        },
        message: "Your account is pending administrator approval.",
      });

      const loginRes = await executeController(userController.authLogin, {
        method: "POST",
        body: { email: "test@ventionteams.com", password: "password123" },
      });
      expect(loginRes.statusCode).toBe(403);
      expect(loginRes.body).toEqual({
        error: "Your account is pending administrator approval.",
      });
    });
  });

  describe("Route Endpoints", () => {
    const signup = async (name: string, email: string) =>
      executeController(userController.authSignup, {
        method: "POST",
        body: { name, email, password: "password123" },
      });

    const login = async (email: string) =>
      executeController(userController.authLogin, {
        method: "POST",
        body: { email, password: "password123" },
      });

    const approveUser = (email: string) => {
      const user = users.find((candidate) => candidate.email === email);
      if (user) {
        user.status = "active";
      }
    };

    it("POST /signup creates a user", async () => {
      const res = await signup("Alice", "alice@ventionteams.com");
      expect(res.statusCode).toBe(201);
      const body = res.body;
      expect(body?.user.email).toBe("alice@ventionteams.com");
      expect(body?.user.status).toBe("pending");
      expect(body).not.toHaveProperty("accessToken");
    });

    it("POST /login blocks pending user", async () => {
      await signup("Bob", "bob@ventionteams.com");

      const res = await login("bob@ventionteams.com");

      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({
        error: "Your account is pending administrator approval.",
      });
    });

    it("GET /:userId returns user when authorized", async () => {
      await signup("Carol", "carol@ventionteams.com");
      approveUser("carol@ventionteams.com");

      const loginRes = await login("carol@ventionteams.com");
      const loginBody = loginRes.body;
      const token = loginBody.accessToken as string;
      const userId = String(loginBody.user.id);

      const unauthRes = await executeProtectedController(
        userController.getUserById,
        {
          method: "GET",
          params: { userId },
        },
      );
      expect(unauthRes.statusCode).toBe(401);

      const res = await executeProtectedController(userController.getUserById, {
        method: "GET",
        params: { userId },
        token,
      });

      expect(res.statusCode).toBe(200);
      const body = res.body;
      expect(body?.email).toBe("carol@ventionteams.com");
    });

    it("POST /refresh-token issues new tokens", async () => {
      await signup("Dave", "dave@ventionteams.com");
      approveUser("dave@ventionteams.com");

      const loginRes = await login("dave@ventionteams.com");
      const loginBody = loginRes.body;
      const { refreshToken } = loginBody;

      const res = await executeController(userController.refreshToken, {
        method: "POST",
        body: { refreshToken },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("accessToken");
      expect(res.body).toHaveProperty("refreshToken");
    });

    it("PATCH /:userId updates user data", async () => {
      await signup("Eve", "eve@ventionteams.com");
      approveUser("eve@ventionteams.com");

      const loginRes = await login("eve@ventionteams.com");
      const loginBody = loginRes.body;
      const token = loginBody.accessToken as string;
      const userId = String(loginBody.user.id);

      const unauthRes = await executeProtectedController(
        userController.updateUser,
        {
          method: "PATCH",
          params: { userId },
          body: { name: "NewEve" },
        },
      );
      expect(unauthRes.statusCode).toBe(401);

      const res = await executeProtectedController(userController.updateUser, {
        method: "PATCH",
        params: { userId },
        body: { name: "NewEve" },
        token,
      });

      expect(res.statusCode).toBe(200);
      const body = res.body;
      expect(body?.name).toBe("NewEve");
    });

    it("uses the authenticated user when route userId differs", async () => {
      await signup("Owner", "owner@ventionteams.com");
      await signup("Other", "other@ventionteams.com");
      approveUser("owner@ventionteams.com");
      approveUser("other@ventionteams.com");

      const ownerLoginRes = await login("owner@ventionteams.com");
      const otherLoginRes = await login("other@ventionteams.com");
      const ownerToken = ownerLoginRes.body.accessToken as string;
      const ownerUserId = String(ownerLoginRes.body.user.id);
      const otherUserId = String(otherLoginRes.body.user.id);

      const getRes = await executeProtectedController(
        userController.getUserById,
        {
          method: "GET",
          params: { userId: otherUserId },
          token: ownerToken,
        },
      );
      expect(getRes.statusCode).toBe(200);
      expect(getRes.body?.id).toBe(ownerUserId);
      expect(getRes.body?.email).toBe("owner@ventionteams.com");

      const updateRes = await executeProtectedController(
        userController.updateUser,
        {
          method: "PATCH",
          params: { userId: otherUserId },
          body: { name: "Owner Updated" },
          token: ownerToken,
        },
      );
      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body?.id).toBe(ownerUserId);
      expect(updateRes.body?.name).toBe("Owner Updated");

      const integrationsRes = await executeProtectedController(
        userController.updateUserIntegrations,
        {
          method: "PATCH",
          params: { userId: otherUserId },
          body: { analyzeEnabled: true },
          token: ownerToken,
        },
      );
      expect(integrationsRes.statusCode).toBe(200);
      expect(integrationsRes.body?.id).toBe(ownerUserId);
      expect(integrationsRes.body?.analyzeEnabled).toBe(true);

      const generateTokenRes = await executeProtectedController(
        userController.generateMcpToken,
        {
          method: "POST",
          params: { userId: otherUserId },
          token: ownerToken,
        },
      );
      expect(generateTokenRes.statusCode).toBe(200);
      expect(users.find((user) => user.id === ownerUserId)?.mcpToken).toBe(
        generateTokenRes.body?.mcpToken,
      );
      expect(users.find((user) => user.id === otherUserId)?.mcpToken).toBeNull();

      const revokeTokenRes = await executeProtectedController(
        userController.revokeMcpToken,
        {
          method: "DELETE",
          params: { userId: otherUserId },
          token: ownerToken,
        },
      );
      expect(revokeTokenRes.statusCode).toBe(200);
      expect(users.find((user) => user.id === ownerUserId)?.mcpToken).toBe("");
      expect(users.find((user) => user.id === otherUserId)?.mcpToken).toBeNull();
    });
  });

  describe("Update & Refresh Flows", () => {
    const signup = async () =>
      executeController(userController.authSignup, {
        method: "POST",
        body: {
          name: "Test",
          email: "test@ventionteams.com",
          password: "password123",
        },
      });

    const login = async () =>
      executeController(userController.authLogin, {
        method: "POST",
        body: { email: "test@ventionteams.com", password: "password123" },
      });

    const approveTestUser = () => {
      const user = users.find((candidate) => candidate.email === "test@ventionteams.com");
      if (user) {
        user.status = "active";
      }
    };

    it("refreshes tokens using /refresh-token", async () => {
      await signup();
      approveTestUser();
      const loginRes = await login();
      const loginBody = loginRes.body;
      const { refreshToken } = loginBody;

      const refreshRes = await executeController(userController.refreshToken, {
        method: "POST",
        body: { refreshToken },
      });
      expect(refreshRes.statusCode).toBe(200);
      expect(refreshRes.body).toHaveProperty("accessToken");
      expect(refreshRes.body).toHaveProperty("refreshToken");
    });

    it("updates user data via PATCH", async () => {
      await signup();
      approveTestUser();
      const loginRes = await login();
      const loginBody = loginRes.body;
      const userId = String(loginBody.user.id);
      const token = loginBody.accessToken as string;

      const patchResUnauth = await executeProtectedController(
        userController.updateUser,
        {
          method: "PATCH",
          params: { userId },
          body: { name: "Updated" },
        },
      );
      expect(patchResUnauth.statusCode).toBe(401);

      const patchRes = await executeProtectedController(
        userController.updateUser,
        {
          method: "PATCH",
          params: { userId },
          body: { name: "Updated" },
          token,
        },
      );
      expect(patchRes.statusCode).toBe(200);
      const body = patchRes.body;
      expect(body?.name).toBe("Updated");
    });

    it("blocks refresh tokens for suspended users", async () => {
      const signupRes = await executeController(userController.signup, {
        method: "POST",
        body: {
          name: "Refresh User",
          email: "refresh@ventionteams.com",
          password: "password123",
        },
      });
      const userId = String(signupRes.body?.id);

      const loginRes = await executeController(userController.login, {
        method: "POST",
        body: {
          email: "refresh@ventionteams.com",
          password: "password123",
        },
      });

      const refreshToken = String(loginRes.body?.refreshToken);
      const user = users.find((candidate) => candidate.id === userId);
      if (user) {
        user.status = "suspended";
      }

      const refreshRes = await executeController(userController.refreshToken, {
        method: "POST",
        body: { refreshToken },
      });

      expect(refreshRes.statusCode).toBe(403);
      expect(refreshRes.body).toEqual({
        error: "Your account is suspended. Please contact an administrator.",
      });
    });

    it("blocks protected routes for pending and suspended users with valid tokens", async () => {
      const signupRes = await executeController(userController.signup, {
        method: "POST",
        body: {
          name: "Protected User",
          email: "protected@ventionteams.com",
          password: "password123",
        },
      });
      const userId = String(signupRes.body?.id);

      const loginRes = await executeController(userController.login, {
        method: "POST",
        body: {
          email: "protected@ventionteams.com",
          password: "password123",
        },
      });
      const token = String(loginRes.body?.accessToken);

      const user = users.find((candidate) => candidate.id === userId);
      if (user) {
        user.status = "pending";
      }

      const pendingRes = await executeProtectedController(
        userController.getUserById,
        {
          method: "GET",
          params: { userId },
          token,
        },
      );
      expect(pendingRes.statusCode).toBe(403);

      if (user) {
        user.status = "suspended";
      }

      const suspendedRes = await executeProtectedController(
        userController.getUserById,
        {
          method: "GET",
          params: { userId },
          token,
        },
      );
      expect(suspendedRes.statusCode).toBe(403);
    });
  });

  describe("Admin User Management", () => {
    const createActiveUser = async (name: string, email: string) => {
      const signupRes = await executeController(userController.signup, {
        method: "POST",
        body: {
          name,
          email,
          password: "password123",
        },
      });

      return signupRes.body as PrismaUser;
    };

    const loginActiveUser = async (email: string) => {
      const loginRes = await executeController(userController.login, {
        method: "POST",
        body: {
          email,
          password: "password123",
        },
      });

      return String(loginRes.body?.accessToken);
    };

    it("allows active admins to list users and manage pending users", async () => {
      const admin = await createActiveUser("Admin", "admin@ventionteams.com");
      const pendingSignupRes = await executeController(userController.authSignup, {
        method: "POST",
        body: {
          name: "Pending User",
          email: "pending@ventionteams.com",
          password: "password123",
        },
      });
      const pendingUserId = String(pendingSignupRes.body?.user.id);

      const adminRecord = users.find((user) => user.id === admin.id);
      if (adminRecord) {
        adminRecord.role = "admin";
      }

      const token = await loginActiveUser("admin@ventionteams.com");

      const listRes = await executeAdminProtectedController(
        userController.listUsers,
        {
          method: "GET",
          token,
        },
      );
      expect(listRes.statusCode).toBe(200);
      expect(listRes.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: "admin@ventionteams.com",
            role: "admin",
          }),
          expect.objectContaining({
            email: "pending@ventionteams.com",
            status: "pending",
          }),
        ]),
      );
      expect(listRes.body).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({
            mcpToken: expect.anything(),
          }),
        ]),
      );

      const approveRes = await executeAdminProtectedController(
        userController.approveUser,
        {
          method: "POST",
          params: { userId: pendingUserId },
          token,
        },
      );
      expect(approveRes.statusCode).toBe(200);
      expect(approveRes.body).toMatchObject({
        id: pendingUserId,
        status: "active",
      });
      expect(approveRes.body).not.toHaveProperty("mcpToken");
    });

    it("rejects admin endpoints for non-admin and unauthenticated requests", async () => {
      await createActiveUser("Member", "member@ventionteams.com");
      const memberToken = await loginActiveUser("member@ventionteams.com");

      const unauthRes = await executeAdminProtectedController(
        userController.listUsers,
        {
          method: "GET",
        },
      );
      expect(unauthRes.statusCode).toBe(401);

      const memberRes = await executeAdminProtectedController(
        userController.listUsers,
        {
          method: "GET",
          token: memberToken,
        },
      );
      expect(memberRes.statusCode).toBe(403);
      expect(memberRes.body).toEqual({
        error: "Admin access is required",
      });
    });

    it("prevents suspending or demoting the last active admin", async () => {
      const admin = await createActiveUser("Solo Admin", "solo@ventionteams.com");
      const adminRecord = users.find((user) => user.id === admin.id);
      if (adminRecord) {
        adminRecord.role = "admin";
      }

      const token = await loginActiveUser("solo@ventionteams.com");

      const suspendRes = await executeAdminProtectedController(
        userController.suspendUser,
        {
          method: "POST",
          params: { userId: admin.id },
          token,
        },
      );
      expect(suspendRes.statusCode).toBe(400);
      expect(suspendRes.body).toEqual({
        error: "Cannot suspend the last active admin user.",
      });

      const demoteRes = await executeAdminProtectedController(
        userController.changeUserRole,
        {
          method: "PATCH",
          params: { userId: admin.id },
          body: { role: "member" },
          token,
        },
      );
      expect(demoteRes.statusCode).toBe(400);
      expect(demoteRes.body).toEqual({
        error: "Cannot demote the last active admin user.",
      });
    });
  });

  describe("Business Logic & Validation", () => {
    const signup = async () =>
      executeController(userController.signup, {
        method: "POST",
        body: {
          name: "Test User",
          email: "test@ventionteams.com",
          password: "password123",
        },
      });

    const login = async () =>
      executeController(userController.login, {
        method: "POST",
        body: { email: "test@ventionteams.com", password: "password123" },
      });

    describe("Input Validation Requirements", () => {
      it("should require user data for signup", async () => {
        const res = await executeController(userController.signup, {
          method: "POST",
        });

        expect(res.statusCode).toBe(400);
        const body = res.body;
        expect(body?.error).toBe("User data is required");
      });

      it("should require login credentials", async () => {
        const res = await executeController(userController.login, {
          method: "POST",
        });

        expect(res.statusCode).toBe(400);
        const body = res.body;
        expect(body?.error).toBe("Login data is required");
      });

      it("should require update data for user updates", async () => {
        await signup();
        const loginRes = await login();
        const loginBody = loginRes.body;
        const { accessToken, user } = loginBody;

        const res = await executeProtectedController(
          userController.updateUser,
          {
            method: "PATCH",
            params: { userId: String(user.id) },
            token: accessToken,
          },
        );

        expect(res.statusCode).toBe(400);
        const body = res.body;
        expect(body?.error).toBe("Update data is required");
      });

      it("should reject empty update data", async () => {
        await signup();
        const loginRes = await login();
        const loginBody = loginRes.body;
        const { accessToken, user } = loginBody;

        const res = await executeProtectedController(
          userController.updateUser,
          {
            method: "PATCH",
            params: { userId: String(user.id) },
            token: accessToken,
            body: {},
          },
        );

        expect(res.statusCode).toBe(400);
        const body = res.body;
        expect(body?.error).toBe("Update data is required");
      });

      it("should require refresh token for token refresh", async () => {
        const res = await executeController(userController.refreshToken, {
          method: "POST",
        });

        expect(res.statusCode).toBe(401);
        const body = res.body;
        expect(body?.error).toContain(
          "Cannot destructure property 'refreshToken'",
        );
      });

      it("should reject empty refresh token", async () => {
        const res = await executeController(userController.refreshToken, {
          method: "POST",
          body: { refreshToken: "" },
        });

        expect(res.statusCode).toBe(400);
        const body = res.body;
        expect(body?.error).toBe("Refresh token is required");
      });
    });

    describe("Database Error Handling", () => {
      it("should handle database errors during user lookup", async () => {
        await signup();
        const loginRes = await login();
        const { accessToken } = loginRes.body;

        shouldThrowDatabaseError = true;
        databaseErrorMessage = "User not found";

        const res = await executeProtectedController(
          userController.getUserById,
          {
            method: "GET",
            params: { userId: "999" },
            token: accessToken,
          },
        );

        expect(res.statusCode).toBe(401);
        const body = res.body;
        expect(body?.error).toBe("User not found");
      });

      it("should handle database errors during signup", async () => {
        shouldThrowDatabaseError = true;
        databaseErrorMessage = "Create failed";

        const res = await executeController(userController.signup, {
          method: "POST",
          body: {
            name: "Error",
            email: "error@ventionteams.com",
            password: "password123",
          },
        });

        expect(res.statusCode).toBe(400);
        const body = res.body;
        expect(body?.error).toBe("Create failed");
      });
    });
  });
});
