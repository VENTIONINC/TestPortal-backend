import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { userModel } from "@/models/userModel";
import { signInUser, signUpUser } from "@/services/authService";
import type { PrismaUser } from "@/types";

jest.mock("argon2");
jest.mock("@/models/userModel");
jest.mock("@/services/authService", () => ({
  signUpUser: jest.fn(),
  signInUser: jest.fn(),
  signOutUser: jest.fn(() => Promise.resolve("Signed out successfully")),
}));
jest.mock("@/services/jwtService", () => ({
  jwtService: {
    generateTokenPair: jest.fn(() => ({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    })),
    verifyRefreshToken: jest.fn(),
  },
}));
jest.mock("@/prisma/client", () => ({
  dbClient: {
    $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback({})),
  },
}));

const mockUser: PrismaUser = {
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
  status: "active",
  role: "member",
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  passwordHash: "hashed-password",
  cognitoUserId: null,
  mcpToken: null,
  reportPortalUrl: null,
  reportPortalEnabled: false,
  monitoringPortalUrl: null,
  monitoringPortalEnabled: false,
  analyzeEnabled: false,
};

const loadAuthProviderService = async (provider: "local" | "cognito") => {
  jest.resetModules();
  process.env.AUTH_PROVIDER = provider;

  const authProviderModule = await import("@/services/authProviderService");
  const userModelModule = await import("@/models/userModel");
  const authServiceModule = await import("@/services/authService");
  const argon2Module = await import("argon2");

  return {
    authProviderService: authProviderModule.authProviderService,
    userModel: userModelModule.userModel as jest.Mocked<typeof userModel>,
    signUpUser:
      authServiceModule.signUpUser as jest.MockedFunction<typeof signUpUser>,
    signInUser:
      authServiceModule.signInUser as jest.MockedFunction<typeof signInUser>,
    argon2: argon2Module.default,
  };
};

describe("authProviderService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.COGNITO_USER_POOL_ID = "eu-central-1_abcdefgh";
    process.env.COGNITO_CLIENT_ID = "client123";
    process.env.COGNITO_POOL_REGION = "eu-central-1";
  });

  afterEach(() => {
    process.env.AUTH_PROVIDER = "local";
  });

  it("fails clearly when AUTH_PROVIDER is missing", async () => {
    jest.resetModules();
    delete process.env.AUTH_PROVIDER;

    await expect(import("@/config/environment")).rejects.toThrow(
      "AUTH_PROVIDER environment variable is required",
    );
  });

  it("fails clearly when AUTH_PROVIDER is invalid", async () => {
    jest.resetModules();
    process.env.AUTH_PROVIDER = "invalid-provider";

    await expect(import("@/config/environment")).rejects.toThrow(
      'Unsupported AUTH_PROVIDER "invalid-provider"',
    );
  });

  it("resolves the local provider configuration", async () => {
    const { authProviderService } = await loadAuthProviderService("local");

    expect(authProviderService.getConfig()).toEqual({
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

  it("resolves the cognito provider configuration", async () => {
    const { authProviderService } = await loadAuthProviderService("cognito");

    expect(authProviderService.getConfig()).toEqual({
      provider: "cognito",
      capabilities: {
        passwordLogin: true,
        passwordSignup: true,
        requiresRedirectLogin: false,
        supportsNewPasswordChallenge: true,
        signupRequiresApproval: false,
      },
    });
  });

  it("authenticates valid local credentials", async () => {
    const {
      authProviderService,
      userModel: currentUserModel,
      argon2: currentArgon2,
    } =
      await loadAuthProviderService("local");
    currentUserModel.findByEmail.mockResolvedValue(mockUser);
    (
      currentArgon2.verify as jest.MockedFunction<typeof currentArgon2.verify>
    ).mockResolvedValue(true);

    const result = await authProviderService.login({
      email: mockUser.email,
      password: "password123",
    });

    expect(result).toMatchObject({
      user: {
        id: mockUser.id,
        email: mockUser.email,
      },
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
  });

  it("creates pending member users for local signup without tokens", async () => {
    const { authProviderService, userModel: currentUserModel } =
      await loadAuthProviderService("local");
    currentUserModel.findByEmail.mockResolvedValue(null);
    currentUserModel.create.mockResolvedValue({
      ...mockUser,
      email: "pending@ventionteams.com",
      status: "pending",
      role: "member",
    });

    const result = await authProviderService.signup({
      name: "Pending User",
      email: "pending@ventionteams.com",
      password: "password123",
    });

    expect(currentUserModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "pending@ventionteams.com",
        status: "pending",
        role: "member",
      }),
      expect.anything(),
    );
    expect(result).toEqual({
      user: expect.objectContaining({
        email: "pending@ventionteams.com",
        status: "pending",
        role: "member",
      }),
      message: "Your account is pending administrator approval.",
    });
  });

  it("returns 403-style blocked errors for pending and suspended local users", async () => {
    const {
      authProviderService,
      userModel: currentUserModel,
      argon2: currentArgon2,
    } = await loadAuthProviderService("local");
    (
      currentArgon2.verify as jest.MockedFunction<typeof currentArgon2.verify>
    ).mockResolvedValue(true);

    currentUserModel.findByEmail.mockResolvedValue({
      ...mockUser,
      status: "pending",
    });
    await expect(
      authProviderService.login({
        email: mockUser.email,
        password: "password123",
      }),
    ).rejects.toThrow("Your account is pending administrator approval.");

    currentUserModel.findByEmail.mockResolvedValue({
      ...mockUser,
      status: "suspended",
    });
    await expect(
      authProviderService.login({
        email: mockUser.email,
        password: "password123",
      }),
    ).rejects.toThrow(
      "Your account is suspended. Please contact an administrator.",
    );
  });

  it("rejects invalid local credentials", async () => {
    const {
      authProviderService,
      userModel: currentUserModel,
      argon2: currentArgon2,
    } =
      await loadAuthProviderService("local");
    currentUserModel.findByEmail.mockResolvedValue(mockUser);
    (
      currentArgon2.verify as jest.MockedFunction<typeof currentArgon2.verify>
    ).mockResolvedValue(false);

    await expect(
      authProviderService.login({
        email: mockUser.email,
        password: "wrong-password",
      }),
    ).rejects.toThrow("Invalid email or password");
  });

  it("rejects local users without password hashes", async () => {
    const { authProviderService, userModel: currentUserModel } =
      await loadAuthProviderService("local");
    currentUserModel.findByEmail.mockResolvedValue({
      ...mockUser,
      passwordHash: null,
    });

    await expect(
      authProviderService.login({
        email: mockUser.email,
        password: "password123",
      }),
    ).rejects.toThrow("User account is not properly configured");
  });

  it("preserves successful Cognito login behavior", async () => {
    const {
      authProviderService,
      userModel: currentUserModel,
      signInUser: currentSignInUser,
    } = await loadAuthProviderService("cognito");
    const cognitoSession = { accessToken: "session-token" };

    currentSignInUser.mockResolvedValue({
      status: "SUCCESS",
      session: cognitoSession as never,
    });
    currentUserModel.findByEmail.mockResolvedValue(mockUser);

    const result = await authProviderService.login({
      email: mockUser.email,
      password: "password123",
    });

    expect(currentSignInUser).toHaveBeenCalledWith({
      email: mockUser.email,
      password: "password123",
    });
    expect(result).toMatchObject({
      user: {
        id: mockUser.id,
        email: mockUser.email,
      },
      accessToken: "access-token",
      refreshToken: "refresh-token",
      cognitoSession,
    });
  });

  it("keeps Cognito-created users active members", async () => {
    const {
      authProviderService,
      userModel: currentUserModel,
      signUpUser: currentSignUpUser,
    } = await loadAuthProviderService("cognito");
    currentUserModel.findByEmail.mockResolvedValue(null);
    currentSignUpUser.mockResolvedValue({} as never);
    currentUserModel.create.mockResolvedValue({
      ...mockUser,
      email: "cognito@ventionteams.com",
      cognitoUserId: "cognito@ventionteams.com",
    });

    const result = await authProviderService.signup({
      name: "Cognito User",
      email: "cognito@ventionteams.com",
      password: "password123",
    });

    expect(currentUserModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "active",
        role: "member",
        cognitoUserId: "cognito@ventionteams.com",
      }),
    );
    expect(result.user).toMatchObject({
      status: "active",
      role: "member",
    });
  });

  it("returns the Cognito new-password challenge without issuing tokens", async () => {
    const { authProviderService, signInUser: currentSignInUser } =
      await loadAuthProviderService("cognito");
    currentSignInUser.mockResolvedValue({
      status: "NEW_PASSWORD_REQUIRED",
    });

    const result = await authProviderService.login({
      email: mockUser.email,
      password: "password123",
    });

    expect(result).toEqual({
      status: "NEW_PASSWORD_REQUIRED",
      message: "New password required for first login",
    });
  });
});
