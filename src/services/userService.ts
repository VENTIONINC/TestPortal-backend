// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { userModel } from "@/models/userModel";
import { dbClient } from "@/prisma/client";
import type { PrismaUser } from "@/types";
import argon2 from "argon2";
import { jwtService, type AuthResponse, type JwtPayload } from "./jwtService";
import { generateMcpToken } from "@/lib/mcp-token";
import { signUpUser, signInUser, signOutUser } from "@/services/authService";
import { CognitoUser } from "amazon-cognito-identity-js";

export interface CreateUserParams {
  name: string;
  email: string;
  password: string;
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
}

interface UpdateUserData {
  name?: string;
  email?: string;
  passwordHash?: string;
  cognitoUserId?: string;
  reportPortalUrl?: string | null;
  reportPortalEnabled?: boolean;
  monitoringPortalUrl?: string | null;
  monitoringPortalEnabled?: boolean;
  mcpToken?: string;
}

export const userService = {
  async getUserById(userId: string): Promise<PrismaUser> {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const user = await userModel.findById(userId);

    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
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
    const passwordHash = await argon2.hash(userParams.password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
    });

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
      throw new Error("User ID is required");
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

        const passwordHash = await argon2.hash(password, {
          type: argon2.argon2id,
          memoryCost: 2 ** 16,
          timeCost: 3,
          parallelism: 1,
        });

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
      throw new Error("Email and password are required");
    }

    const user = await userModel.findByEmail(email);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    if (!user.passwordHash) {
      throw new Error("User account is not properly configured");
    }

    const isValidPassword = await argon2.verify(user.passwordHash, password);
    if (!isValidPassword) {
      throw new Error("Invalid email or password");
    }

    return user;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await this.verifyPassword(email, password);

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
    };

    const tokens = jwtService.generateTokenPair(payload);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  },

  async refreshTokens(refreshToken: string): Promise<AuthResponse> {
    const payload = jwtService.verifyRefreshToken(refreshToken);

    const user = await this.getUserById(payload.userId);

    const newTokens = jwtService.generateTokenPair({
      userId: user.id,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
    };
  },

  async generateMcpToken(userId: string): Promise<string> {
    if (!userId) {
      throw new Error("User ID is required");
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
      throw new Error("User ID is required");
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

      // Find or create user in our database
      let user = await userModel.findByEmail(email);
      if (!user) {
        // Create user if they don't exist (federated users, etc.)
        const userData = {
          name: email.split("@")[0] ?? "Unknown", // Use email prefix as default name
          email,
          cognitoUserId: email,
        };
        user = await userModel.create(userData);
      }

      // Generate our internal JWT tokens
      const payload: JwtPayload = {
        userId: user.id,
        email: user.email,
      };

      const tokens = jwtService.generateTokenPair(payload);

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        ...(cognitoResult.session && { cognitoSession: cognitoResult.session }),
      };
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

  async updateUserIntegrations(
    userId: string,
    integrationsData: UpdateUserIntegrationsParams,
  ): Promise<PrismaUser> {
    if (!userId) {
      throw new Error("User ID is required");
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
