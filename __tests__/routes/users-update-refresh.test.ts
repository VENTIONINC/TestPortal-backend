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
    create: jest.fn((data: CreateUserData) => {
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
      const user = users.find((u) => u.id === id);
      if (!user) throw new Error("User not found");
      Object.assign(user, data, { updatedAt: new Date() });
      return Promise.resolve(user);
    }),
  },
}));

describe("users route additional flows", () => {
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

  beforeEach(() => {
    users.length = 0;
    jest.clearAllMocks();
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
