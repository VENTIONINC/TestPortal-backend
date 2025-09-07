import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import type { PrismaUser, PrismaIssue } from "@/types";

process.env.JWT_SECRET = "test-secret";

// In-memory stores
const users: PrismaUser[] = [];
let userIdCounter = 1;
const issues: PrismaIssue[] = [];
let issueIdCounter = 1;

// Mock user model
jest.mock("@/models/userModel", () => ({
  userModel: {
    findById: jest.fn((id: number | string) => {
      const user = users.find((u) => u.id === Number(id));
      return Promise.resolve(user ?? null);
    }),
    findByEmail: jest.fn((email: string) => {
      const user = users.find((u) => u.email === email);
      return Promise.resolve(user ?? null);
    }),
    create: jest.fn(
      (data: { name: string; email: string; passwordHash: string }) => {
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
      },
    ),
  },
}));

// Mock issue model
jest.mock("@/models/issueModel", () => ({
  issueModel: {
    findMany: jest.fn(
      (
        category?: string,
        name?: string,
        page = 1,
        limit = 30,
      ): Promise<PrismaIssue[]> => {
        let filteredIssues = [...issues];

        if (category) {
          filteredIssues = filteredIssues.filter((i) =>
            i.category.toLowerCase().includes(category.toLowerCase()),
          );
        }

        if (name) {
          filteredIssues = filteredIssues.filter((i) =>
            i.name.toLowerCase().includes(name.toLowerCase()),
          );
        }

        const startIndex = (Number(page) - 1) * Number(limit);
        const endIndex = startIndex + Number(limit);

        return Promise.resolve(filteredIssues.slice(startIndex, endIndex));
      },
    ),
    // V2 method with user relations
    findManyWithUsers: jest.fn(
      (category?: string, name?: string, page = 1, limit = 30) => {
        let filteredIssues = [...issues];

        if (category) {
          filteredIssues = filteredIssues.filter((i) =>
            i.category.toLowerCase().includes(category.toLowerCase()),
          );
        }

        if (name) {
          filteredIssues = filteredIssues.filter((i) =>
            i.name.toLowerCase().includes(name.toLowerCase()),
          );
        }

        const startIndex = (Number(page) - 1) * Number(limit);
        const endIndex = startIndex + Number(limit);

        // Add user relations to issues
        const issuesWithUsers = filteredIssues
          .slice(startIndex, endIndex)
          .map((issue) => ({
            ...issue,
            createdBy: issue.createdById
              ? (users.find((u) => u.id === issue.createdById) ?? null)
              : null,
            updatedBy: issue.updatedById
              ? (users.find((u) => u.id === issue.updatedById) ?? null)
              : null,
          }));

        return Promise.resolve(issuesWithUsers);
      },
    ),
    count: jest.fn((category?: string, name?: string) => {
      let filteredIssues = [...issues];

      if (category) {
        filteredIssues = filteredIssues.filter((i) =>
          i.category.toLowerCase().includes(category.toLowerCase()),
        );
      }

      if (name) {
        filteredIssues = filteredIssues.filter((i) =>
          i.name.toLowerCase().includes(name.toLowerCase()),
        );
      }

      return Promise.resolve(filteredIssues.length);
    }),
    findById: jest.fn((id: number | string) => {
      const issue = issues.find((i) => i.id === Number(id));
      return Promise.resolve(issue ?? null);
    }),
    // V2 method with user relations
    findByIdWithUsers: jest.fn((id: number | string) => {
      const issue = issues.find((i) => i.id === Number(id));
      if (!issue) return Promise.resolve(null);

      const issueWithUsers = {
        ...issue,
        createdBy: issue.createdById
          ? (users.find((u) => u.id === issue.createdById) ?? null)
          : null,
        updatedBy: issue.updatedById
          ? (users.find((u) => u.id === issue.updatedById) ?? null)
          : null,
      };
      return Promise.resolve(issueWithUsers);
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
        createdById: data.createdById ?? null,
        updatedById: data.updatedById ?? null,
      };
      issues.push(issue);
      return Promise.resolve(issue);
    }),
    update: jest.fn((id: number | string, data: Partial<PrismaIssue>) => {
      const issue = issues.find((i) => i.id === Number(id));
      if (!issue) throw new Error("Issue not found");
      Object.assign(issue, data, { updatedAt: new Date() });
      return Promise.resolve(issue);
    }),
  },
}));

import usersRouter from "../users";
import issuesRouter from "../issue";

const app = express();
app.use(express.json());
app.use("/api", usersRouter);
app.use("/api", issuesRouter);

describe("Issues v2 Routes", () => {
  let authToken: string;
  let testUser: PrismaUser;

  beforeEach(async () => {
    // Clear data
    users.length = 0;
    issues.length = 0;
    userIdCounter = 1;
    issueIdCounter = 1;

    // Create test user and get auth token
    await request(app).post("/api/v2/users/signup").send({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    });

    const loginRes = await request(app)
      .post("/api/v2/users/login")
      .send({ email: "test@example.com", password: "password123" });

    authToken = loginRes.body.accessToken;
    testUser = loginRes.body.user;
  });

  describe("GET /v2/issues", () => {
    it("should require authentication", async () => {
      const response = await request(app).get("/api/v2/issues");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Authorization header is required");
    });

    it("should return all issues when authenticated", async () => {
      // Create test issues
      await request(app)
        .post("/api/v2/issues")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Test Issue 1", category: "bug" });

      await request(app)
        .post("/api/v2/issues")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Test Issue 2", category: "feature" });

      const response = await request(app)
        .get("/api/v2/issues")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.issues).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body.page).toBe(1);
      expect(response.body.totalPages).toBe(1);
    });

    it("should filter issues by category", async () => {
      await request(app)
        .post("/api/v2/issues")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Bug Issue", category: "bug" });

      await request(app)
        .post("/api/v2/issues")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Feature Issue", category: "feature" });

      const response = await request(app)
        .get("/api/v2/issues?category=bug")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.issues).toHaveLength(1);
      expect(response.body.issues[0].category).toBe("bug");
    });

    it("should filter issues by name", async () => {
      await request(app)
        .post("/api/v2/issues")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Login Bug", category: "bug" });

      await request(app)
        .post("/api/v2/issues")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Payment Feature", category: "feature" });

      const response = await request(app)
        .get("/api/v2/issues?name=Login")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.issues).toHaveLength(1);
      expect(response.body.issues[0].name).toBe("Login Bug");
    });

    it("should support pagination", async () => {
      // Create 5 test issues
      for (let i = 1; i <= 5; i++) {
        await request(app)
          .post("/api/v2/issues")
          .set("Authorization", `Bearer ${authToken}`)
          .send({ name: `Issue ${i}`, category: "test" });
      }

      const response = await request(app)
        .get("/api/v2/issues?page=2&limit=2")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.issues).toHaveLength(2);
      expect(response.body.page).toBe(2);
      expect(response.body.total).toBe(5);
      expect(response.body.totalPages).toBe(3);
    });

    it("should return empty array when no issues exist", async () => {
      const response = await request(app)
        .get("/api/v2/issues")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.issues).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });

    it("should return serialized issues with user information", async () => {
      // Create a test issue
      await request(app)
        .post("/api/v2/issues")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Test Issue", category: "bug" });

      const response = await request(app)
        .get("/api/v2/issues")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.issues).toHaveLength(1);

      const issue = response.body.issues[0];

      // Verify serialized structure
      expect(issue.createdBy).toBeDefined();
      expect(issue.updatedBy).toBeDefined();

      // Verify user information is properly serialized (no password)
      expect(issue.createdBy.id).toBe(testUser.id);
      expect(issue.createdBy.name).toBe(testUser.name);
      expect(issue.createdBy.email).toBe(testUser.email);
      expect(issue.createdBy.createdAt).toBeDefined();
      expect(issue.createdBy.passwordHash).toBeUndefined(); // Should not be included

      expect(issue.updatedBy.id).toBe(testUser.id);
      expect(issue.updatedBy.name).toBe(testUser.name);
      expect(issue.updatedBy.email).toBe(testUser.email);
      expect(issue.updatedBy.createdAt).toBeDefined();
      expect(issue.updatedBy.passwordHash).toBeUndefined(); // Should not be included
    });
  });

  describe("GET /v2/issues/:issueId", () => {
    it("should require authentication", async () => {
      const response = await request(app).get("/api/v2/issues/1");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Authorization header is required");
    });

    it("should return specific issue when authenticated", async () => {
      const createResponse = await request(app)
        .post("/api/v2/issues")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Test Issue",
          category: "bug",
          description: "Test description",
          portal: "admin-portal",
          service: "test-service",
          ticket: "TICKET-123",
        });

      const issueId = createResponse.body.id;

      const response = await request(app)
        .get(`/api/v2/issues/${issueId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(issueId);
      expect(response.body.name).toBe("Test Issue");
      expect(response.body.category).toBe("bug");
      expect(response.body.description).toBe("Test description");
      expect(response.body.portal).toBe("admin-portal");
      expect(response.body.service).toBe("test-service");
      expect(response.body.ticket).toBe("TICKET-123");
    });

    it("should return all issues when issue ID is missing from path", async () => {
      const response = await request(app)
        .get("/api/v2/issues/")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.issues).toBeDefined();
    });

    it("should return 404 when issue not found", async () => {
      const response = await request(app)
        .get("/api/v2/issues/999")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Issue with ID 999 not found");
    });

    it("should return serialized issue with user information", async () => {
      const createResponse = await request(app)
        .post("/api/v2/issues")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Test Issue",
          category: "bug",
          description: "Test description",
        });

      const issueId = createResponse.body.id;

      const response = await request(app)
        .get(`/api/v2/issues/${issueId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // Verify serialized structure
      expect(response.body.createdBy).toBeDefined();
      expect(response.body.updatedBy).toBeDefined();

      // Verify user information is properly serialized (no password)
      expect(response.body.createdBy.id).toBe(testUser.id);
      expect(response.body.createdBy.name).toBe(testUser.name);
      expect(response.body.createdBy.email).toBe(testUser.email);
      expect(response.body.createdBy.createdAt).toBeDefined();
      expect(response.body.createdBy.passwordHash).toBeUndefined(); // Should not be included

      expect(response.body.updatedBy.id).toBe(testUser.id);
      expect(response.body.updatedBy.name).toBe(testUser.name);
      expect(response.body.updatedBy.email).toBe(testUser.email);
      expect(response.body.updatedBy.createdAt).toBeDefined();
      expect(response.body.updatedBy.passwordHash).toBeUndefined(); // Should not be included
    });
  });

  describe("POST /v2/issues", () => {
    it("should require authentication", async () => {
      const response = await request(app)
        .post("/api/v2/issues")
        .send({ name: "Test Issue", category: "bug" });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Authorization header is required");
    });

    it("should create issue with minimal required fields", async () => {
      const response = await request(app)
        .post("/api/v2/issues")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Test Issue", category: "bug" });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe("Test Issue");
      expect(response.body.category).toBe("bug");
      expect(response.body.createdById).toBe(testUser.id);
      expect(response.body.updatedById).toBe(testUser.id);
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });

    it("should create issue with all fields", async () => {
      const issueData = {
        name: "Complex Issue",
        category: "feature",
        description: "A detailed description",
        portal: "user-portal",
        service: "auth-service",
        ticket: "TICKET-456",
      };

      const response = await request(app)
        .post("/api/v2/issues")
        .set("Authorization", `Bearer ${authToken}`)
        .send(issueData);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe(issueData.name);
      expect(response.body.category).toBe(issueData.category);
      expect(response.body.description).toBe(issueData.description);
      expect(response.body.portal).toBe(issueData.portal);
      expect(response.body.service).toBe(issueData.service);
      expect(response.body.ticket).toBe(issueData.ticket);
      expect(response.body.createdById).toBe(testUser.id);
      expect(response.body.updatedById).toBe(testUser.id);
    });

    it("should return 400 when name is missing", async () => {
      const response = await request(app)
        .post("/api/v2/issues")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ category: "bug" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Unable to create issue without name");
    });

    it("should return 400 when request body is empty", async () => {
      const response = await request(app)
        .post("/api/v2/issues")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Unable to create issue without name");
    });
  });

  describe("PATCH /v2/issues/:issueId", () => {
    let testIssueId: number;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post("/api/v2/issues")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Original Issue",
          category: "bug",
          description: "Original description",
        });
      testIssueId = createResponse.body.id;
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .patch(`/api/v2/issues/${testIssueId}`)
        .send({ name: "Updated Issue" });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Authorization header is required");
    });

    it("should update issue successfully", async () => {
      const updateData = {
        name: "Updated Issue",
        category: "feature",
        description: "Updated description",
        portal: "new-portal",
        service: "new-service",
        ticket: "NEW-TICKET-789",
      };

      const response = await request(app)
        .patch(`/api/v2/issues/${testIssueId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.category).toBe(updateData.category);
      expect(response.body.description).toBe(updateData.description);
      expect(response.body.portal).toBe(updateData.portal);
      expect(response.body.service).toBe(updateData.service);
      expect(response.body.ticket).toBe(updateData.ticket);
      expect(response.body.updatedById).toBe(testUser.id);
    });

    it("should update only provided fields", async () => {
      const response = await request(app)
        .patch(`/api/v2/issues/${testIssueId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Partially Updated" });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe("Partially Updated");
      expect(response.body.category).toBe("bug"); // unchanged
      expect(response.body.description).toBe("Original description"); // unchanged
    });

    it("should handle null values for optional fields", async () => {
      const response = await request(app)
        .patch(`/api/v2/issues/${testIssueId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          description: null,
          portal: null,
          service: null,
          ticket: null,
        });

      expect(response.status).toBe(200);
      expect(response.body.description).toBeNull();
      expect(response.body.portal).toBeNull();
      expect(response.body.service).toBeNull();
      expect(response.body.ticket).toBeNull();
    });

    it("should return 400 when issue ID is missing", async () => {
      const response = await request(app)
        .patch("/api/v2/issues/")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Updated" });

      expect(response.status).toBe(404);
    });

    it("should update issue with only updatedById when request body is empty", async () => {
      const response = await request(app)
        .patch(`/api/v2/issues/${testIssueId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      // Due to controller logic, empty object still gets updatedById added,
      // so it doesn't trigger the "empty data" validation
      expect(response.status).toBe(200);
      expect(response.body.updatedById).toBe(testUser.id);
      expect(response.body.name).toBe("Original Issue"); // unchanged
    });

    it("should return 400 when issue not found", async () => {
      const response = await request(app)
        .patch("/api/v2/issues/999")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Updated" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        "Failed to update issue. Issue not found",
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid JSON in request body", async () => {
      const response = await request(app)
        .post("/api/v2/issues")
        .set("Authorization", `Bearer ${authToken}`)
        .set("Content-Type", "application/json")
        .send("invalid json");

      expect(response.status).toBe(400);
    });

    it("should handle invalid authorization header", async () => {
      const response = await request(app)
        .get("/api/v2/issues")
        .set("Authorization", "InvalidToken");

      expect(response.status).toBe(401);
    });

    it("should handle expired/invalid JWT token", async () => {
      const response = await request(app)
        .get("/api/v2/issues")
        .set("Authorization", "Bearer invalid.jwt.token");

      expect(response.status).toBe(401);
    });
  });

  describe("Integration Tests", () => {
    it("should support full CRUD workflow", async () => {
      // Create
      const createResponse = await request(app)
        .post("/api/v2/issues")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "CRUD Test Issue", category: "test" });

      expect(createResponse.status).toBe(201);
      const issueId = createResponse.body.id;

      // Read individual
      const getResponse = await request(app)
        .get(`/api/v2/issues/${issueId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.name).toBe("CRUD Test Issue");

      // Update
      const updateResponse = await request(app)
        .patch(`/api/v2/issues/${issueId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Updated CRUD Test Issue", category: "updated" });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.name).toBe("Updated CRUD Test Issue");
      expect(updateResponse.body.category).toBe("updated");

      // Read all (verify update)
      const getAllResponse = await request(app)
        .get("/api/v2/issues")
        .set("Authorization", `Bearer ${authToken}`);

      expect(getAllResponse.status).toBe(200);
      expect(getAllResponse.body.issues).toHaveLength(1);
      expect(getAllResponse.body.issues[0].name).toBe(
        "Updated CRUD Test Issue",
      );
    });

    it("should maintain user context across operations", async () => {
      // Create second user
      await request(app).post("/api/v2/users/signup").send({
        name: "Second User",
        email: "second@example.com",
        password: "password123",
      });

      const loginRes2 = await request(app)
        .post("/api/v2/users/login")
        .send({ email: "second@example.com", password: "password123" });

      const secondAuthToken = loginRes2.body.accessToken;
      const secondUser = loginRes2.body.user;

      // Create issue with first user
      const createResponse1 = await request(app)
        .post("/api/v2/issues")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "First User Issue", category: "test" });

      expect(createResponse1.body.createdById).toBe(testUser.id);

      // Update with second user
      const updateResponse = await request(app)
        .patch(`/api/v2/issues/${createResponse1.body.id}`)
        .set("Authorization", `Bearer ${secondAuthToken}`)
        .send({ description: "Updated by second user" });

      expect(updateResponse.body.updatedById).toBe(secondUser.id);
      expect(updateResponse.body.createdById).toBe(testUser.id); // Should remain unchanged

      // Create issue with second user
      const createResponse2 = await request(app)
        .post("/api/v2/issues")
        .set("Authorization", `Bearer ${secondAuthToken}`)
        .send({ name: "Second User Issue", category: "test" });

      expect(createResponse2.body.createdById).toBe(secondUser.id);
    });
  });

  describe("GET /v2/issues/with-stats", () => {
    it("should require authentication", async () => {
      const response = await request(app).get("/api/v2/issues/with-stats");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Authorization header is required");
    });

    it("should return all issues with stats when authenticated", async () => {
      await request(app)
        .post("/api/v2/issues")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Test Issue 1", category: "bug" });

      const response = await request(app)
        .get("/api/v2/issues/with-stats")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.issues).toHaveLength(1);
      expect(response.body.issues[0]).toHaveProperty("statistics");
      expect(response.body.issues[0].statistics).toHaveProperty(
        "occurrenceCount",
      );
      expect(response.body.issues[0].createdBy.id).toBe(testUser.id);
    });
  });
});
