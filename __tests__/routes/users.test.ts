// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import type { PrismaUser } from "@/types";
import { userController } from "@/controllers/userController";
import {
  executeController,
  executeProtectedController,
} from "@/test-utils/httpMocks";

interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
}

const users: PrismaUser[] = [];
const generateUserId = () => crypto.randomUUID();
let shouldThrowDatabaseError = false;
let databaseErrorMessage = "Database error";
const mockTx = {};

jest.mock("@/prisma/client", () => ({
  dbClient: {
    $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
      callback({}),
    ),
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
      if (!user) throw new Error("User not found");
      Object.assign(user, data, { updatedAt: new Date() });
      return Promise.resolve(user);
    }),
  },
}));

describe("Users Routes", () => {
  beforeEach(() => {
    users.length = 0;
    shouldThrowDatabaseError = false;
    databaseErrorMessage = "Database error";
    process.env.MCP_SECRET = "test-mcp-secret";
    jest.clearAllMocks();
  });

  describe("Authentication Flow", () => {
    it("allows signup, login and protected access", async () => {
      const signupRes = await executeController(userController.signup, {
        method: "POST",
        body: {
          name: "Test",
          email: "test@ventionteams.com",
          password: "password123",
        },
      });
      expect(signupRes.statusCode).toBe(201);

      const loginRes = await executeController(userController.login, {
        method: "POST",
        body: { email: "test@ventionteams.com", password: "password123" },
      });
      expect(loginRes.statusCode).toBe(200);
      const loginBody = loginRes.body;
      expect(loginBody).toHaveProperty("accessToken");
      expect(loginBody).toHaveProperty("refreshToken");

      const userId = String(loginBody.user.id);
      const token = loginBody.accessToken as string;

      const unauthRes = await executeProtectedController(
        userController.getUserById,
        {
          method: "GET",
          params: { userId },
        },
      );
      expect(unauthRes.statusCode).toBe(401);

      const authRes = await executeProtectedController(
        userController.getUserById,
        {
          method: "GET",
          params: { userId },
          token,
        },
      );
      expect(authRes.statusCode).toBe(200);
      const authBody = authRes.body;
      expect(authBody?.email).toBe("test@ventionteams.com");
    });
  });

  describe("Route Endpoints", () => {
    const signup = async (name: string, email: string) =>
      executeController(userController.signup, {
        method: "POST",
        body: { name, email, password: "password123" },
      });

    const login = async (email: string) =>
      executeController(userController.login, {
        method: "POST",
        body: { email, password: "password123" },
      });

    it("POST /signup creates a user", async () => {
      const res = await signup("Alice", "alice@ventionteams.com");
      expect(res.statusCode).toBe(201);
      const body = res.body;
      expect(body?.email).toBe("alice@ventionteams.com");
    });

    it("POST /login authenticates user", async () => {
      await signup("Bob", "bob@ventionteams.com");

      const res = await login("bob@ventionteams.com");

      expect(res.statusCode).toBe(200);
      const body = res.body;
      expect(body).toHaveProperty("accessToken");
      expect(body).toHaveProperty("refreshToken");
    });

    it("GET /:userId returns user when authorized", async () => {
      await signup("Carol", "carol@ventionteams.com");

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
      executeController(userController.signup, {
        method: "POST",
        body: {
          name: "Test",
          email: "test@ventionteams.com",
          password: "password123",
        },
      });

    const login = async () =>
      executeController(userController.login, {
        method: "POST",
        body: { email: "test@ventionteams.com", password: "password123" },
      });

    it("refreshes tokens using /refresh-token", async () => {
      await signup();
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
