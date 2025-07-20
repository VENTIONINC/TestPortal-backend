import { userModel } from "@/models/userModel";
import type { PrismaUser } from "@/types";
import argon2 from "argon2";
import { jwtService, type AuthResponse, type JwtPayload } from "./jwtService";
import { generateMcpToken } from "@/lib/mcp-token";

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

export interface LoginParams {
  email: string;
  password: string;
}

interface UpdateUserData {
  name?: string;
  email?: string;
  passwordHash?: string;
}

export const userService = {
  async getUserById(userId: number | string): Promise<PrismaUser> {
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

    if (!userParams.email.endsWith('@ventionteams.com')) {
      throw new Error("Registration not allowed");
    }

    const existingUser = await userModel.findByEmail(userParams.email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const passwordHash = await argon2.hash(userParams.password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
    });

    const userData = {
      name: userParams.name,
      email: userParams.email,
      passwordHash,
    };

    const userRecord = await userModel.create(userData);
    return userRecord;
  },

  async updateUser(
    userId: number | string,
    updateData: UpdateUserParams,
  ): Promise<PrismaUser> {
    if (!userId) {
      throw new Error("User ID is required");
    }

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

      const existingUser = await userModel.findByEmail(email);
      if (existingUser && existingUser.id !== Number(userId)) {
        throw new Error("Email is already in use by another user");
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

    const updatedUser = await userModel.update(userId, cleanUpdateData);
    return updatedUser;
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

  async generateMcpToken(userId: number | string): Promise<string> {
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

  async revokeMcpToken(userId: number | string): Promise<void> {
    if (!userId) {
      throw new Error("User ID is required");
    }

    await this.getUserById(userId); // Verify user exists

    await userModel.update(userId, { mcpToken: "" });
  },
};
