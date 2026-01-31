import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { metaController } from "@/controllers/metaController";
import { executeProtectedController } from "@/test-utils/httpMocks";
import { jwtService } from "@/services/jwtService";
import { userService } from "@/services/userService";
import type { PrismaUser } from "@/types";

jest.mock("@/services/userService", () => ({
  userService: {
    getUserById: jest.fn(),
  },
}));

describe("meta route", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns 401 when token is missing", async () => {
    const res = await executeProtectedController(metaController.getMeta, {
      method: "GET",
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns build metadata when token is valid", async () => {
    process.env.APP_NAME = "TestPortal";
    process.env.APP_VERSION = "1.8.2";
    process.env.BUILD_HASH = "a1b2c3d4e5f6";
    process.env.BUILD_TIME = "2026-01-31T12:05:00Z";
    process.env.APP_ENV = "prod";

    const getUserByIdMock =
      userService.getUserById as jest.MockedFunction<
        typeof userService.getUserById
      >;

    const mockUser: PrismaUser = {
      id: "user-1",
      name: "Test",
      email: "test@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordHash: null,
      cognitoUserId: null,
      mcpToken: null,
      reportPortalUrl: null,
      reportPortalEnabled: false,
      monitoringPortalUrl: null,
      monitoringPortalEnabled: false,
      analyzeEnabled: false,
    };

    getUserByIdMock.mockResolvedValue(mockUser);

    const token = jwtService.generateAccessToken({
      userId: "user-1",
      email: "test@example.com",
    });

    const res = await executeProtectedController(metaController.getMeta, {
      method: "GET",
      token,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      name: "TestPortal",
      component: "backend",
      version: "1.8.2",
      buildHash: "a1b2c3d4",
      buildTime: "2026-01-31T12:05:00Z",
      env: "prod",
      runtime: {
        node: process.version,
      },
    });
  });
});
