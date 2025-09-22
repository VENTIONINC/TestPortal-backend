import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import type { PrismaUser } from "@/types";

interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
}

process.env.JWT_SECRET = "test-secret";

const users: PrismaUser[] = [];
let idCounter = 1;
let shouldThrowDatabaseError = false;
let databaseErrorMessage = "Database error";

jest.mock("@/models/userModel", () => ({
  userModel: {
    findById: jest.fn((id: number | string) => {
      if (shouldThrowDatabaseError) {
        throw new Error(databaseErrorMessage);
      }
      const user = users.find((u) => u.id === Number(id));
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
      if (shouldThrowDatabaseError) {
        throw new Error(databaseErrorMessage);
      }
      const user = users.find((u) => u.id === Number(id));
      if (!user) throw new Error("User not found");
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
app.use("/api", testRouter);

describe("Users Route - Business Logic Tests", () => {
  beforeEach(() => {
    users.length = 0;
    idCounter = 1;
    shouldThrowDatabaseError = false;
    databaseErrorMessage = "Database error";
    jest.clearAllMocks();
  });

  describe("Input Validation Requirements", () => {
    it("should require user data for signup", async () => {
      const res = await request(app).post("/api/v2/users/signup");

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("User data is required");
    });

    it("should require login credentials", async () => {
      const res = await request(app).post("/api/v2/users/login");

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Login data is required");
    });

    it("should require update data for user updates", async () => {
      // First create a user and get auth token
      await request(app).post("/api/v2/users/signup").send({
        name: "Test User",
        email: "test@ventionteams.com",
        password: "password123",
      });

      const loginRes = await request(app)
        .post("/api/v2/users/login")
        .send({ email: "test@ventionteams.com", password: "password123" });

      const { accessToken, user } = loginRes.body;

      // Test missing update data
      const res = await request(app)
        .patch(`/api/v2/users/${user.id}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Update data is required");
    });

    it("should reject empty update data", async () => {
      // Create user and get token
      await request(app).post("/api/v2/users/signup").send({
        name: "Test User",
        email: "test@ventionteams.com",
        password: "password123",
      });

      const loginRes = await request(app)
        .post("/api/v2/users/login")
        .send({ email: "test@ventionteams.com", password: "password123" });

      const { accessToken, user } = loginRes.body;

      const res = await request(app)
        .patch(`/api/v2/users/${user.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Update data is required");
    });

    it("should require refresh token for token refresh", async () => {
      const res = await request(app).post("/api/v2/users/refresh-token");

      expect(res.status).toBe(401);
      expect(res.body.error).toContain(
        "Cannot destructure property 'refreshToken'",
      );
    });

    it("should reject empty refresh token", async () => {
      const res = await request(app)
        .post("/api/v2/users/refresh-token")
        .send({ refreshToken: "" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Refresh token is required");
    });
  });

  describe("Database Error Handling", () => {
    it("should handle database errors during user lookup", async () => {
      // Create user first to get valid token
      await request(app).post("/api/v2/users/signup").send({
        name: "Test User",
        email: "test@ventionteams.com",
        password: "password123",
      });

      const loginRes = await request(app)
        .post("/api/v2/users/login")
        .send({ email: "test@ventionteams.com", password: "password123" });

      const { accessToken } = loginRes.body;

      // Simulate database error
      shouldThrowDatabaseError = true;
      databaseErrorMessage = "User not found";

      const res = await request(app)
        .get("/api/v2/users/999")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("User not found");
    });

    it("should handle database errors during user creation", async () => {
      shouldThrowDatabaseError = true;
      databaseErrorMessage = "Database connection failed";

      const res = await request(app).post("/api/v2/users/signup").send({
        name: "Test User",
        email: "test@ventionteams.com",
        password: "password123",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Database connection failed");
    });

    it("should handle authentication errors during login", async () => {
      shouldThrowDatabaseError = true;
      databaseErrorMessage = "Authentication service unavailable";

      const res = await request(app)
        .post("/api/v2/users/login")
        .send({ email: "test@ventionteams.com", password: "password123" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Authentication service unavailable");
    });

    it("should handle database errors during user updates", async () => {
      // Create user first
      await request(app).post("/api/v2/users/signup").send({
        name: "Test User",
        email: "test@ventionteams.com",
        password: "password123",
      });

      const loginRes = await request(app)
        .post("/api/v2/users/login")
        .send({ email: "test@ventionteams.com", password: "password123" });

      const { accessToken, user } = loginRes.body;

      // Simulate database error
      shouldThrowDatabaseError = true;
      databaseErrorMessage = "Update operation failed";

      const res = await request(app)
        .patch(`/api/v2/users/${user.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ name: "Updated Name" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Update operation failed");
    });

    it("should handle token service errors during refresh", async () => {
      shouldThrowDatabaseError = true;
      databaseErrorMessage = "Invalid or expired refresh token";

      const res = await request(app)
        .post("/api/v2/users/refresh-token")
        .send({ refreshToken: "some-invalid-token" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid or expired refresh token");
    });
  });

  describe("Security Requirements", () => {
    it("should not expose password hash in signup response", async () => {
      const res = await request(app).post("/api/v2/users/signup").send({
        name: "Test User",
        email: "test@ventionteams.com",
        password: "password123",
      });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Test User");
      expect(res.body.email).toBe("test@ventionteams.com");
      expect(res.body.passwordHash).toBeUndefined();
      expect(res.body.password).toBeUndefined();
    });

    it("should not expose password hash in login response", async () => {
      await request(app).post("/api/v2/users/signup").send({
        name: "Test User",
        email: "test@ventionteams.com",
        password: "password123",
      });

      const res = await request(app)
        .post("/api/v2/users/login")
        .send({ email: "test@ventionteams.com", password: "password123" });

      expect(res.status).toBe(200);
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it("should not expose password hash in user profile response", async () => {
      await request(app).post("/api/v2/users/signup").send({
        name: "Test User",
        email: "test@ventionteams.com",
        password: "password123",
      });

      const loginRes = await request(app)
        .post("/api/v2/users/login")
        .send({ email: "test@ventionteams.com", password: "password123" });

      const { accessToken, user } = loginRes.body;

      const res = await request(app)
        .get(`/api/v2/users/${user.id}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.passwordHash).toBeUndefined();
      expect(res.body.password).toBeUndefined();
    });

    it("should not expose password hash in update response", async () => {
      await request(app).post("/api/v2/users/signup").send({
        name: "Test User",
        email: "test@ventionteams.com",
        password: "password123",
      });

      const loginRes = await request(app)
        .post("/api/v2/users/login")
        .send({ email: "test@ventionteams.com", password: "password123" });

      const { accessToken, user } = loginRes.body;

      const res = await request(app)
        .patch(`/api/v2/users/${user.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ name: "Updated Name" });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Updated Name");
      expect(res.body.passwordHash).toBeUndefined();
      expect(res.body.password).toBeUndefined();
    });

    it("should require authentication for protected routes", async () => {
      // Create a user first
      await request(app).post("/api/v2/users/signup").send({
        name: "Test User",
        email: "test@ventionteams.com",
        password: "password123",
      });

      const loginRes = await request(app)
        .post("/api/v2/users/login")
        .send({ email: "test@ventionteams.com", password: "password123" });

      const { user } = loginRes.body;

      // Test accessing profile without token
      const getUserRes = await request(app).get(`/api/v2/users/${user.id}`);

      expect(getUserRes.status).toBe(401);
      expect(getUserRes.body.error).toBe("Authorization header is required");

      // Test updating without token
      const updateRes = await request(app)
        .patch(`/api/v2/users/${user.id}`)
        .send({ name: "Hacker" });

      expect(updateRes.status).toBe(401);
      expect(updateRes.body.error).toBe("Authorization header is required");
    });
  });

  describe("Data Integrity", () => {
    it("should handle malformed JSON requests gracefully", async () => {
      const res = await request(app)
        .post("/api/v2/users/signup")
        .type("application/json")
        .send('{"name": "test", "email":}'); // Invalid JSON

      expect(res.status).toBe(400);
    });

    it("should handle null values in request data", async () => {
      const res = await request(app)
        .post("/api/v2/users/signup")
        .send({ name: null, email: null, password: null });

      // Should either validate and reject, or handle gracefully
      expect([400, 401]).toContain(res.status);
      expect(res.body.error).toBeDefined();
    });
  });

  describe("Functional Requirements", () => {
    it("should successfully complete full user lifecycle", async () => {
      // 1. User signup
      const signupRes = await request(app).post("/api/v2/users/signup").send({
        name: "Lifecycle Test",
        email: "lifecycle@ventionteams.com",
        password: "password123",
      });

      expect(signupRes.status).toBe(201);
      expect(signupRes.body.name).toBe("Lifecycle Test");
      expect(signupRes.body.email).toBe("lifecycle@ventionteams.com");

      // 2. User login
      const loginRes = await request(app)
        .post("/api/v2/users/login")
        .send({ email: "lifecycle@ventionteams.com", password: "password123" });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.accessToken).toBeDefined();
      expect(loginRes.body.refreshToken).toBeDefined();

      const { accessToken, refreshToken, user } = loginRes.body;

      // 3. Get user profile
      const profileRes = await request(app)
        .get(`/api/v2/users/${user.id}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(profileRes.status).toBe(200);
      expect(profileRes.body.name).toBe("Lifecycle Test");
      expect(profileRes.body.email).toBe("lifecycle@ventionteams.com");

      // 4. Update user profile
      const updateRes = await request(app)
        .patch(`/api/v2/users/${user.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ name: "Updated Lifecycle Test" });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.name).toBe("Updated Lifecycle Test");

      // 5. Refresh authentication token
      const refreshRes = await request(app)
        .post("/api/v2/users/refresh-token")
        .send({ refreshToken });

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.accessToken).toBeDefined();
      expect(refreshRes.body.refreshToken).toBeDefined();
    });
  });
});
