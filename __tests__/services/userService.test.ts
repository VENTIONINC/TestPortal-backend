// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { userModel } from "@/models/userModel";
import argon2 from "argon2";
import { userService } from "@/services/userService";
import type { PrismaUser } from "@/types";

import { generateMcpToken } from "@/lib/mcp-token";

// Mock dependencies
jest.mock("@/models/userModel");
jest.mock("argon2");
jest.mock("@/services/jwtService", () => ({
  jwtService: {
    generateTokenPair: jest.fn(),
    verifyRefreshToken: jest.fn(),
  },
}));

// Mock Prisma client
const mockTx = {};
jest.mock("@/prisma/client", () => ({
  dbClient: {
    $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
      callback(mockTx),
    ),
  },
}));

// Mock MCP token generation
jest.mock("@/lib/mcp-token", () => ({
  generateMcpToken: jest.fn(),
}));

const mockGenerateMcpToken = generateMcpToken as jest.Mock;

const mockUserModel = userModel as jest.Mocked<typeof userModel>;

describe("userService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (argon2.hash as jest.MockedFunction<typeof argon2.hash>).mockResolvedValue(
      "hashed_password",
    );
    process.env.MCP_SECRET = "test-secret";
  });

  afterEach(() => {
    delete process.env.MCP_SECRET;
  });

  describe("signup", () => {
    const validUserParams = {
      name: "Test User",
      email: "test@ventionteams.com",
      password: "password123",
    };

    it("should use transaction for signup", async () => {
      mockUserModel.findByEmail.mockResolvedValue(null);
      mockUserModel.create.mockResolvedValue({
        id: "user-1",
        ...validUserParams,
      } as unknown as PrismaUser);

      await userService.signup(validUserParams);

      expect(mockUserModel.findByEmail).toHaveBeenCalledWith(
        validUserParams.email,
        mockTx,
      );
      expect(mockUserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: validUserParams.email,
        }),
        mockTx,
      );
    });

    it("should fail if user exists within transaction", async () => {
      mockUserModel.findByEmail.mockResolvedValue({
        id: "existing-user",
      } as unknown as PrismaUser);

      await expect(userService.signup(validUserParams)).rejects.toThrow(
        "An error occurred during registration. Please try again or contact support.",
      );
      expect(mockUserModel.findByEmail).toHaveBeenCalledWith(
        validUserParams.email,
        mockTx,
      );
      expect(mockUserModel.create).not.toHaveBeenCalled();
    });
  });

  describe("updateUser", () => {
    const userId = "user-1";
    const updateParams = {
      email: "new@ventionteams.com",
    };

    it("should use transaction for updateUser", async () => {
      mockUserModel.findByEmail.mockResolvedValue(null);
      mockUserModel.update.mockResolvedValue({
        id: userId,
        ...updateParams,
      } as unknown as PrismaUser);

      await userService.updateUser(userId, updateParams);

      expect(mockUserModel.findByEmail).toHaveBeenCalledWith(
        updateParams.email,
        mockTx,
      );
      expect(mockUserModel.update).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          email: updateParams.email,
        }),
        mockTx,
      );
    });

    it("should fail if email taken by another user within transaction", async () => {
      mockUserModel.findByEmail.mockResolvedValue({
        id: "other-user",
      } as unknown as PrismaUser);

      await expect(
        userService.updateUser(userId, updateParams),
      ).rejects.toThrow(
        "An error occurred while updating the profile. Please try again or contact support.",
      );
      expect(mockUserModel.findByEmail).toHaveBeenCalledWith(
        updateParams.email,
        mockTx,
      );
      expect(mockUserModel.update).not.toHaveBeenCalled();
    });
  });

  describe("MCP Token Operations", () => {
    const mockUserId = "550e8400-e29b-41d4-a716-446655440000";
    const mockUser = {
      id: mockUserId,
      name: "Test User",
      email: "test@example.com",
      passwordHash: "hashedpassword",
      mcpToken: "",
    };
    const mockMcpToken = `mcp_${mockUserId}_1234567890_randomhex.signature`;

    describe("generateMcpToken", () => {
      it("should generate and store MCP token for valid user", async () => {
        mockUserModel.findById.mockResolvedValue(
          mockUser as unknown as PrismaUser,
        );
        mockGenerateMcpToken.mockReturnValue(mockMcpToken);
        mockUserModel.update.mockResolvedValue(
          undefined as unknown as PrismaUser,
        );

        const result = await userService.generateMcpToken(mockUserId);

        expect(mockUserModel.findById).toHaveBeenCalledWith(mockUserId);
        expect(mockGenerateMcpToken).toHaveBeenCalledWith(
          mockUserId,
          "test-secret",
        );
        expect(mockUserModel.update).toHaveBeenCalledWith(mockUserId, {
          mcpToken: mockMcpToken,
        });
        expect(result).toBe(mockMcpToken);
      });

      it("should handle different UUID", async () => {
        const differentUserId = "6fa459ea-ee8a-3ca4-894e-db77e160355e";
        const differentUser = { ...mockUser, id: differentUserId };
        mockUserModel.findById.mockResolvedValue(
          differentUser as unknown as PrismaUser,
        );
        mockGenerateMcpToken.mockReturnValue(mockMcpToken);
        mockUserModel.update.mockResolvedValue(
          undefined as unknown as PrismaUser,
        );

        const result = await userService.generateMcpToken(differentUserId);

        expect(mockUserModel.findById).toHaveBeenCalledWith(differentUserId);
        expect(mockGenerateMcpToken).toHaveBeenCalledWith(
          differentUserId,
          "test-secret",
        );
        expect(result).toBe(mockMcpToken);
      });

      it("should throw error when userId is not provided", async () => {
        await expect(userService.generateMcpToken("")).rejects.toThrow(
          "User ID is required",
        );
        await expect(
          userService.generateMcpToken(null as unknown as string),
        ).rejects.toThrow("User ID is required");
        await expect(
          userService.generateMcpToken(undefined as unknown as string),
        ).rejects.toThrow("User ID is required");
      });

      it("should throw error when user does not exist", async () => {
        mockUserModel.findById.mockResolvedValue(null);

        await expect(userService.generateMcpToken(mockUserId)).rejects.toThrow(
          `User with ID ${mockUserId} not found`,
        );
      });

      it("should throw error when MCP_SECRET is not configured", async () => {
        delete process.env.MCP_SECRET;
        mockUserModel.findById.mockResolvedValue(
          mockUser as unknown as PrismaUser,
        );

        await expect(userService.generateMcpToken(mockUserId)).rejects.toThrow(
          "MCP_SECRET environment variable is not configured",
        );
      });

      it("should handle database errors during token storage", async () => {
        mockUserModel.findById.mockResolvedValue(
          mockUser as unknown as PrismaUser,
        );
        mockGenerateMcpToken.mockReturnValue(mockMcpToken);
        mockUserModel.update.mockRejectedValue(new Error("Database error"));

        await expect(userService.generateMcpToken(mockUserId)).rejects.toThrow(
          "Database error",
        );
      });
    });

    describe("revokeMcpToken", () => {
      it("should revoke MCP token for valid user", async () => {
        mockUserModel.findById.mockResolvedValue(
          mockUser as unknown as PrismaUser,
        );
        mockUserModel.update.mockResolvedValue(
          undefined as unknown as PrismaUser,
        );

        await userService.revokeMcpToken(mockUserId);

        expect(mockUserModel.findById).toHaveBeenCalledWith(mockUserId);
        expect(mockUserModel.update).toHaveBeenCalledWith(mockUserId, {
          mcpToken: "",
        });
      });

      it("should handle string userId", async () => {
        const stringUserId = "12345";
        mockUserModel.findById.mockResolvedValue(
          mockUser as unknown as PrismaUser,
        );
        mockUserModel.update.mockResolvedValue(
          undefined as unknown as PrismaUser,
        );

        await userService.revokeMcpToken(stringUserId);

        expect(mockUserModel.findById).toHaveBeenCalledWith(stringUserId);
        expect(mockUserModel.update).toHaveBeenCalledWith(stringUserId, {
          mcpToken: "",
        });
      });

      it("should throw error when userId is not provided", async () => {
        await expect(userService.revokeMcpToken("")).rejects.toThrow(
          "User ID is required",
        );
        await expect(
          userService.revokeMcpToken(null as unknown as string),
        ).rejects.toThrow("User ID is required");
        await expect(
          userService.revokeMcpToken(undefined as unknown as string),
        ).rejects.toThrow("User ID is required");
      });

      it("should throw error when user does not exist", async () => {
        mockUserModel.findById.mockResolvedValue(null);

        await expect(userService.revokeMcpToken(mockUserId)).rejects.toThrow(
          `User with ID ${mockUserId} not found`,
        );
      });

      it("should handle database errors during token revocation", async () => {
        mockUserModel.findById.mockResolvedValue(
          mockUser as unknown as PrismaUser,
        );
        mockUserModel.update.mockRejectedValue(new Error("Database error"));

        await expect(userService.revokeMcpToken(mockUserId)).rejects.toThrow(
          "Database error",
        );
      });

      it("should successfully revoke token even if user has no existing token", async () => {
        const userWithoutToken = { ...mockUser, mcpToken: "" };
        mockUserModel.findById.mockResolvedValue(
          userWithoutToken as unknown as PrismaUser,
        );
        mockUserModel.update.mockResolvedValue(
          undefined as unknown as PrismaUser,
        );

        await expect(
          userService.revokeMcpToken(mockUserId),
        ).resolves.not.toThrow();
        expect(mockUserModel.update).toHaveBeenCalledWith(mockUserId, {
          mcpToken: "",
        });
      });
    });
  });
});
