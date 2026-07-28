// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { userModel } from "@/models/userModel";
import { dbClient } from "@/prisma/client";
import type { PrismaUser } from "@/types";
import { Prisma, UserRole, UserStatus } from "@prisma/client";
import argon2 from "argon2";
import { jwtService, type AuthResponse, type JwtPayload } from "./jwtService";
import { generateMcpToken } from "@/lib/mcp-token";
import { signUpUser, signInUser, signOutUser } from "@/services/authService";
import { CognitoUser } from "amazon-cognito-identity-js";

export type SafeUser = Omit<PrismaUser, "passwordHash">;
export type UserLifecycleStatus = PrismaUser["status"];
export type UserApplicationRole = PrismaUser["role"];

export class UserServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "UserServiceError";
  }
}

export interface CreateUserParams {
  name: string;
  email: string;
  password: string;
  status?: UserLifecycleStatus;
  role?: UserApplicationRole;
}

export interface UpdateUserParams {
  name?: string;
  email?: string;
  password?: string;
}

export interface UpdateUserIntegrationsParams {
  reportPortalUrl?: string | null;
  reportPortalEnabled?: boolean;
  monitoringPortalUrl?: string | null;
  monitoringPortalEnabled?: boolean;
  analyzeEnabled?: boolean;
}

export interface LoginParams {
  email: string;
  password: string;
  newPassword?: string;
}

interface UpdateUserData {
  name?: string;
  email?: string;
  status?: UserStatus;
  role?: UserRole;
  passwordHash?: string;
  cognitoUserId?: string;
  reportPortalUrl?: string | null;
  reportPortalEnabled?: boolean;
  monitoringPortalUrl?: string | null;
  monitoringPortalEnabled?: boolean;
  mcpToken?: string;
}

interface ChangeUserRoleParams {
  targetUserId: string;
  role: UserApplicationRole;
}

const PASSWORD_HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 2 ** 16,
  timeCost: 3,
  parallelism: 1,
} as const;

const LOCAL_SIGNUP_PENDING_MESSAGE =
  "Your account is pending administrator approval.";

const getBlockedUserMessage = (status: UserLifecycleStatus): string => {
  if (status === "pending") {
    return LOCAL_SIGNUP_PENDING_MESSAGE;
  }

  return "Your account is suspended. Please contact an administrator.";
};

export const toSafeUser = (user: PrismaUser): SafeUser => {
  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
};

export const userService = {
  LOCAL_SIGNUP_PENDING_MESSAGE,

  createAuthResponse(
    user: PrismaUser,
    options: { cognitoSession?: unknown } = {},
  ): AuthResponse {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
    };

    const tokens = jwtService.generateTokenPair(payload);

    return {
      user: toSafeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      ...(options.cognitoSession
        ? { cognitoSession: options.cognitoSession }
        : {}),
    };
  },

  assertActiveUser(user: PrismaUser): PrismaUser {
    if (user.status !== UserStatus.active) {
      throw new UserServiceError(getBlockedUserMessage(user.status), 403);
    }

    return user;
  },

  async getUserById(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PrismaUser> {
    if (!userId) {
      throw new UserServiceError("User ID is required", 400);
    }

    const user = await userModel.findById(userId, tx);

    if (!user) {
      throw new UserServiceError(`User with ID ${userId} not found`, 404);
    }

    return user;
  },

  async signup(userParams: CreateUserParams): Promise<PrismaUser> {
    if (!userParams?.name || !userParams?.email || !userParams?.password) {
      throw new Error("Unable to create user without required fields");
    }

    if (userParams.name.length < 2) {
      throw new Error("User name must be at least 2 characters");
    }

    if (userParams.password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userParams.email)) {
      throw new Error("Invalid email format");
    }

    if (!userParams.email.endsWith("@ventionteams.com")) {
      throw new Error("Registration not allowed");
    }

    // Hash password before checking user existence to prevent timing attacks
    const passwordHash = await argon2.hash(
      userParams.password,
      PASSWORD_HASH_OPTIONS,
    );

    return await dbClient.$transaction(async (tx) => {
      const existingUser = await userModel.findByEmail(userParams.email, tx);
      if (existingUser) {
        throw new Error(
          "An error occurred during registration. Please try again or contact support.",
        );
      }

      const userData = {
        name: userParams.name,
        email: userParams.email,
        status: userParams.status ?? UserStatus.active,
        role: userParams.role ?? UserRole.member,
        passwordHash,
      };

      return await userModel.create(userData, tx);
    });
  },

  async updateUser(
    userId: string,
    updateData: UpdateUserParams,
  ): Promise<PrismaUser> {
    if (!userId) {
      throw new UserServiceError("User ID is required", 400);
    }

    return await dbClient.$transaction(async (tx) => {
      const { name, email, password } = updateData;
      const cleanUpdateData: UpdateUserData = {};

      if (name) {
        if (name.length < 2) {
          throw new Error("User name must be at least 2 characters");
        }
        cleanUpdateData.name = name;
      }

      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new Error("Invalid email format");
        }

        const existingUser = await userModel.findByEmail(email, tx);
        if (existingUser && existingUser.id !== userId) {
          throw new Error(
            "An error occurred while updating the profile. Please try again or contact support.",
          );
        }

        cleanUpdateData.email = email;
      }

      if (password) {
        if (password.length < 8) {
          throw new Error("Password must be at least 8 characters");
        }

        const passwordHash = await argon2.hash(password, PASSWORD_HASH_OPTIONS);

        cleanUpdateData.passwordHash = passwordHash;
      }

      Object.keys(cleanUpdateData).forEach(
        (key) =>
          cleanUpdateData[key as keyof UpdateUserData] === undefined &&
          delete cleanUpdateData[key as keyof UpdateUserData],
      );

      return await userModel.update(userId, cleanUpdateData, tx);
    });
  },

  async verifyPassword(email: string, password: string): Promise<PrismaUser> {
    if (!email || !password) {
      throw new UserServiceError("Email and password are required", 400);
    }

    const user = await userModel.findByEmail(email);
    if (!user) {
      throw new UserServiceError("Invalid email or password", 401);
    }

    if (!user.passwordHash) {
      throw new Error("User account is not properly configured");
    }

    const isValidPassword = await argon2.verify(user.passwordHash, password);
    if (!isValidPassword) {
      throw new UserServiceError("Invalid email or password", 401);
    }

    return user;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await this.verifyPassword(email, password);
    return this.createAuthResponse(this.assertActiveUser(user));
  },

  async refreshTokens(refreshToken: string): Promise<AuthResponse> {
    const payload = jwtService.verifyRefreshToken(refreshToken);

    const user = await this.getUserById(payload.userId);

    return this.createAuthResponse(this.assertActiveUser(user));
  },

  async generateMcpToken(userId: string): Promise<string> {
    if (!userId) {
      throw new UserServiceError("User ID is required", 400);
    }

    const user = await this.getUserById(userId);

    const mcpTokenSecret = process.env.MCP_SECRET;
    if (!mcpTokenSecret) {
      throw new Error("MCP_SECRET environment variable is not configured");
    }

    const mcpToken = generateMcpToken(user.id, mcpTokenSecret);

    await userModel.update(user.id, { mcpToken });

    return mcpToken;
  },

  async revokeMcpToken(userId: string): Promise<void> {
    if (!userId) {
      throw new UserServiceError("User ID is required", 400);
    }

    await this.getUserById(userId); // Verify user exists

    await userModel.update(userId, { mcpToken: "" });
  },

  // Cognito-specific methods
  async signupWithCognito(
    name: string,
    email: string,
    password: string,
  ): Promise<{ user: PrismaUser; cognitoUser: CognitoUser }> {
    if (!name || !email || !password) {
      throw new Error("Name, email, and password are required");
    }

    if (name.length < 2) {
      throw new Error("User name must be at least 2 characters");
    }

    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }

    // Check if user already exists in our database
    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      throw new Error(
        "An error occurred during registration. Please try again or contact support.",
      );
    }

    try {
      // Sign up with Cognito
      const cognitoUser = await signUpUser(email, email, password);

      // Create user in our database without password hash (Cognito manages it)
      const userData = {
        name,
        email,
        status: UserStatus.active,
        role: UserRole.member,
        cognitoUserId: email, // Using email as cognito user identifier for now
      };

      const userRecord = await userModel.create(userData);
      return { user: userRecord, cognitoUser };
    } catch (error) {
      throw new Error(`Cognito signup failed: ${(error as Error).message}`);
    }
  },

  async loginWithCognito(
    email: string,
    password: string,
    newPassword?: string,
  ): Promise<AuthResponse> {
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    try {
      // Authenticate with Cognito
      const cognitoResult = await signInUser({
        email,
        password,
        ...(newPassword && { newPassword }),
      });

      if (cognitoResult.status === "NEW_PASSWORD_REQUIRED") {
        throw new Error("New password required");
      }

      let user = await userModel.findByEmail(email);
      if (!user) {
        user = await this.createCognitoBackedUser(email);
      }

      return this.createAuthResponse(this.assertActiveUser(user), {
        ...(cognitoResult.session ? { cognitoSession: cognitoResult.session } : {}),
      });
    } catch (error) {
      throw new Error(`Cognito login failed: ${(error as Error).message}`);
    }
  },

  async signOutFromCognito(): Promise<string> {
    try {
      const result = await signOutUser();
      return result as string;
    } catch (error) {
      throw new Error(`Cognito sign out failed: ${(error as Error).message}`);
    }
  },

  async findUserByCognitoId(cognitoUserId: string): Promise<PrismaUser | null> {
    return await userModel.findByCognitoUserId(cognitoUserId);
  },

  async findUserByEmail(email: string): Promise<PrismaUser | null> {
    return await userModel.findByEmail(email);
  },

  async createCognitoBackedUser(email: string): Promise<PrismaUser> {
    const userData = {
      name: email.split("@")[0] ?? "Unknown",
      email,
      status: UserStatus.active,
      role: UserRole.member,
      cognitoUserId: email,
    };

    return await userModel.create(userData);
  },

  async listUsers(): Promise<PrismaUser[]> {
    return await userModel.list();
  },

  async approvePendingUser(userId: string): Promise<PrismaUser> {
    const user = await this.getUserById(userId);

    if (user.status === UserStatus.active) {
      return user;
    }

    return await userModel.update(userId, { status: UserStatus.active });
  },

  async suspendUser(userId: string): Promise<PrismaUser> {
    return await dbClient.$transaction(async (tx) => {
      const user = await this.getUserById(userId, tx);

      if (
        user.role === UserRole.admin &&
        user.status === UserStatus.active &&
        (await userModel.countActiveAdmins(tx)) <= 1
      ) {
        throw new UserServiceError(
          "Cannot suspend the last active admin user.",
          400,
        );
      }

      if (user.status === UserStatus.suspended) {
        return user;
      }

      return await userModel.update(userId, { status: UserStatus.suspended }, tx);
    });
  },

  async restoreSuspendedUser(userId: string): Promise<PrismaUser> {
    const user = await this.getUserById(userId);

    if (user.status === UserStatus.active) {
      return user;
    }

    return await userModel.update(userId, { status: UserStatus.active });
  },

  async changeUserRole({
    targetUserId,
    role,
  }: ChangeUserRoleParams): Promise<PrismaUser> {
    return await dbClient.$transaction(async (tx) => {
      const user = await this.getUserById(targetUserId, tx);

      if (
        user.role === UserRole.admin &&
        role === UserRole.member &&
        user.status === UserStatus.active &&
        (await userModel.countActiveAdmins(tx)) <= 1
      ) {
        throw new UserServiceError(
          "Cannot demote the last active admin user.",
          400,
        );
      }

      if (user.role === role) {
        return user;
      }

      return await userModel.update(targetUserId, { role }, tx);
    });
  },

  async upsertLocalAdmin(params: CreateUserParams): Promise<PrismaUser> {
    if (!params.name || !params.email || !params.password) {
      throw new UserServiceError(
        "Name, email, and password are required",
        400,
      );
    }

    const passwordHash = await argon2.hash(params.password, PASSWORD_HASH_OPTIONS);

    return await dbClient.$transaction(async (tx) => {
      const existingUser = await userModel.findByEmail(params.email, tx);

      if (existingUser) {
        return await userModel.update(
          existingUser.id,
          {
            name: params.name,
            passwordHash,
            status: UserStatus.active,
            role: UserRole.admin,
          },
          tx,
        );
      }

      return await userModel.create(
        {
          name: params.name,
          email: params.email,
          passwordHash,
          status: UserStatus.active,
          role: UserRole.admin,
        },
        tx,
      );
    });
  },

  async updateUserIntegrations(
    userId: string,
    integrationsData: UpdateUserIntegrationsParams,
  ): Promise<PrismaUser> {
    if (!userId) {
      throw new UserServiceError("User ID is required", 400);
    }

    await this.getUserById(userId);

    const cleanIntegrationsData: {
      reportPortalUrl?: string | null;
      reportPortalEnabled?: boolean;
      monitoringPortalUrl?: string | null;
      monitoringPortalEnabled?: boolean;
      analyzeEnabled?: boolean;
    } = {};

    if (integrationsData.reportPortalUrl !== undefined) {
      if (integrationsData.reportPortalUrl?.trim()) {
        const urlString = integrationsData.reportPortalUrl.trim();
        try {
          new URL(urlString);
          cleanIntegrationsData.reportPortalUrl = urlString;
        } catch {
          throw new Error("Invalid report portal URL format");
        }
      } else {
        cleanIntegrationsData.reportPortalUrl = null;
      }
    }

    if (integrationsData.reportPortalEnabled !== undefined) {
      cleanIntegrationsData.reportPortalEnabled =
        integrationsData.reportPortalEnabled;
    }

    if (integrationsData.monitoringPortalUrl !== undefined) {
      if (integrationsData.monitoringPortalUrl?.trim()) {
        const urlString = integrationsData.monitoringPortalUrl.trim();
        try {
          new URL(urlString);
          cleanIntegrationsData.monitoringPortalUrl = urlString;
        } catch {
          throw new Error("Invalid monitoring portal URL format");
        }
      } else {
        cleanIntegrationsData.monitoringPortalUrl = null;
      }
    }

    if (integrationsData.monitoringPortalEnabled !== undefined) {
      cleanIntegrationsData.monitoringPortalEnabled =
        integrationsData.monitoringPortalEnabled;
    }

    if (integrationsData.analyzeEnabled !== undefined) {
      cleanIntegrationsData.analyzeEnabled = integrationsData.analyzeEnabled;
    }

    const updatedUser = await userModel.update(userId, cleanIntegrationsData);
    return updatedUser;
  },
};
