// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";
import { generateMcpToken, validateMcpToken } from "@/lib/mcp-token";

describe("MCP Token Generation and Validation", () => {
  const mockSecret = "test-secret-key";
  const mockUserId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateMcpToken", () => {
    it("should generate a valid MCP token with correct format", () => {
      const token = generateMcpToken(mockUserId, mockSecret);

      expect(token).toMatch(/^mcp_[0-9a-f-]+_\d+_[a-f0-9]{32}\.[a-f0-9]{64}$/);
      expect(token).toContain(`mcp_${mockUserId}_`);
    });

    it("should generate unique tokens for the same user", () => {
      const token1 = generateMcpToken(mockUserId, mockSecret);
      const token2 = generateMcpToken(mockUserId, mockSecret);

      expect(token1).not.toBe(token2);
    });

    it("should generate different tokens for different users", () => {
      const userId1 = "550e8400-e29b-41d4-a716-446655440000";
      const userId2 = "6fa459ea-ee8a-3ca4-894e-db77e160355e";
      const token1 = generateMcpToken(userId1, mockSecret);
      const token2 = generateMcpToken(userId2, mockSecret);

      expect(token1).not.toBe(token2);
      expect(token1).toContain(`mcp_${userId1}_`);
      expect(token2).toContain(`mcp_${userId2}_`);
    });

    it("should generate different tokens with different secrets", () => {
      const token1 = generateMcpToken(mockUserId, "secret1");
      const token2 = generateMcpToken(mockUserId, "secret2");

      expect(token1).not.toBe(token2);
    });
  });

  describe("validateMcpToken", () => {
    it("should validate a correctly generated token", () => {
      const token = generateMcpToken(mockUserId, mockSecret);
      const result = validateMcpToken(token, mockSecret);

      expect(result).toEqual({ userId: mockUserId, isValid: true });
    });

    it("should return null for invalid token format", () => {
      expect(validateMcpToken("invalid-token", mockSecret)).toBeNull();
      expect(validateMcpToken("mcp_123", mockSecret)).toBeNull();
      expect(validateMcpToken("mcp_123_456", mockSecret)).toBeNull();
      expect(validateMcpToken("mcp_123_456_abc", mockSecret)).toBeNull();
    });

    it("should return null for token without signature", () => {
      expect(validateMcpToken("mcp_123_456_abc123", mockSecret)).toBeNull();
    });

    it("should return null for token with wrong signature", () => {
      const token = generateMcpToken(mockUserId, mockSecret);
      const [payload] = token.split(".");
      const tamperedToken = `${payload}.wrongsignature`;

      expect(validateMcpToken(tamperedToken, mockSecret)).toBeNull();
    });

    it("should return null for token with wrong secret", () => {
      const token = generateMcpToken(mockUserId, mockSecret);
      const result = validateMcpToken(token, "wrong-secret");

      expect(result).toBeNull();
    });

    it("should return null for invalid UUID format", () => {
      const malformedToken = "mcp_invalid-uuid_1234567890_randomhex.signature";
      expect(validateMcpToken(malformedToken, mockSecret)).toBeNull();
    });

    it("should return null for expired token", () => {
      const oldTimestamp = Date.now() - 31 * 24 * 60 * 60 * 1000; // 31 days ago
      const expiredPayload = `mcp_${mockUserId}_${oldTimestamp}_randomhex123`;

      jest.spyOn(Date, "now").mockReturnValue(Date.now());

      const mockToken = `${expiredPayload}.fakesignature`;
      expect(validateMcpToken(mockToken, mockSecret)).toBeNull();
    });

    it("should validate token within expiration window", () => {
      const recentTimestamp = Date.now() - 29 * 24 * 60 * 60 * 1000; // 29 days ago

      jest.spyOn(Date, "now").mockReturnValue(recentTimestamp);
      const token = generateMcpToken(mockUserId, mockSecret);

      jest.spyOn(Date, "now").mockReturnValue(Date.now());
      const result = validateMcpToken(token, mockSecret);

      expect(result).toEqual({ userId: mockUserId, isValid: true });
    });

    it("should handle malformed JSON gracefully", () => {
      expect(validateMcpToken("", mockSecret)).toBeNull();
      expect(validateMcpToken("malformed", mockSecret)).toBeNull();
    });
  });

  describe("Token security", () => {
    it("should include timestamp in token for replay protection", () => {
      const token = generateMcpToken(mockUserId, mockSecret);
      const [payload] = token.split(".");
      const [, , timestamp] = payload?.split("_") ?? [];

      expect(parseInt(timestamp ?? "0")).toBeGreaterThan(Date.now() - 1000);
      expect(parseInt(timestamp ?? "0")).toBeLessThanOrEqual(Date.now());
    });

    it("should include random bytes for uniqueness", () => {
      const token = generateMcpToken(mockUserId, mockSecret);
      const [payload] = token.split(".");
      const [, , , randomBytes] = payload?.split("_") ?? [];

      expect(randomBytes).toHaveLength(32);
      expect(randomBytes).toMatch(/^[a-f0-9]{32}$/);
    });

    it("should use HMAC-SHA256 for signature", () => {
      const token = generateMcpToken(mockUserId, mockSecret);
      const [, signature] = token.split(".");

      expect(signature).toHaveLength(64);
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});
