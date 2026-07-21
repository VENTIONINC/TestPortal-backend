// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { uploadApiKeyModel } from "@/models/uploadApiKeyModel";
import crypto from "crypto";

interface GenerateApiKeyResponse {
  id: string;
  projectId: string;
  ownerId: string;
  apiKey: string; // Plain text API key - only returned once
  createdAt: Date;
}

interface ApiKeyListItem {
  id: string;
  projectId: string;
  projectName: string;
  apiKey: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ValidatedApiKey {
  projectId: string;
  ownerId: string;
  keyId: string;
}

/**
 * Generates a self-contained HMAC-based API key for uploads
 * Format: upload_{keyId}_{projectId}_{ownerId}_{timestamp}_{randomBytes}.{hmacSignature}
 */
function generateUploadApiKey(
  keyId: string,
  projectId: string,
  ownerId: string,
  secret: string,
): string {
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(16).toString("hex");
  const payload = `upload_${keyId}_${projectId}_${ownerId}_${timestamp}_${randomBytes}`;

  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return `${payload}.${signature}`;
}

/**
 * Validates an HMAC-based upload API key without database lookup
 * Returns key info if valid, null if invalid
 */
function validateUploadApiKey(
  token: string,
  secret: string,
): { keyId: string; projectId: string; ownerId: string; isValid: true } | null {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;

    const [prefix, keyId, projectId, ownerId, timestampStr, randomBytes] =
      payload.split("_");
    if (
      prefix !== "upload" ||
      !keyId ||
      !projectId ||
      !ownerId ||
      !timestampStr ||
      !randomBytes
    )
      return null;

    // Verify signature
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    if (expectedSig !== signature) return null;

    // UUID validation pattern
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (
      !uuidPattern.test(keyId) ||
      !uuidPattern.test(projectId) ||
      !uuidPattern.test(ownerId)
    )
      return null;

    return { keyId, projectId, ownerId, isValid: true };
  } catch {
    return null;
  }
}

export const uploadApiKeyService = {
  /**
   * Generate a new API key for a project
   * Returns the plain text API key - this is the only time it will be visible
   */
  async generateApiKey(
    projectId: string,
    ownerId: string,
  ): Promise<GenerateApiKeyResponse> {
    if (!projectId || !ownerId) {
      throw new Error("Project ID and owner ID are required");
    }

    const apiKeySecret = process.env.API_KEY_SECRET ?? process.env.JWT_SECRET;
    if (!apiKeySecret) {
      throw new Error(
        "API_KEY_SECRET or JWT_SECRET environment variable is required",
      );
    }

    // Create database record first to get the ID
    const apiKeyRecord = await uploadApiKeyModel.create({
      apiKey: "pending", // Temporary placeholder
      projectId,
      ownerId,
    });

    // Generate self-contained HMAC token using the record ID
    const plainApiKey = generateUploadApiKey(
      apiKeyRecord.id,
      projectId,
      ownerId,
      apiKeySecret,
    );

    // Update record with the token prefix for reference
    const tokenPayload = plainApiKey.split(".")[0];
    if (!tokenPayload) {
      throw new Error("Failed to generate API key payload");
    }
    await uploadApiKeyModel.updateApiKey(apiKeyRecord.id, {
      apiKey: tokenPayload, // Store payload for reference
    });

    // Return the complete token (only time it's visible)
    const result = {
      id: apiKeyRecord.id,
      projectId: apiKeyRecord.projectId,
      ownerId: apiKeyRecord.ownerId,
      apiKey: plainApiKey,
      createdAt: apiKeyRecord.createdAt,
    };

    return result;
  },

  /**
   * Validate an API key and return project/owner information
   * Uses HMAC verification - no database lookup needed for validation
   */
  async validateApiKey(plainApiKey: string): Promise<ValidatedApiKey> {
    if (!plainApiKey) {
      throw new Error("API key is required");
    }

    const apiKeySecret = process.env.API_KEY_SECRET ?? process.env.JWT_SECRET;
    if (!apiKeySecret) {
      throw new Error(
        "API_KEY_SECRET or JWT_SECRET environment variable is required",
      );
    }

    // Validate HMAC signature
    const validated = validateUploadApiKey(plainApiKey, apiKeySecret);
    if (!validated) {
      throw new Error("Invalid API key");
    }

    // Check if key is still active in database
    const keyRecord = await uploadApiKeyModel.findById(validated.keyId);
    if (!keyRecord?.isActive) {
      throw new Error("API key has been revoked or does not exist");
    }

    if (
      keyRecord.projectId !== validated.projectId ||
      keyRecord.ownerId !== validated.ownerId
    ) {
      throw new Error("API key payload does not match stored key record");
    }

    return {
      projectId: validated.projectId,
      ownerId: validated.ownerId,
      keyId: validated.keyId,
    };
  },

  /**
   * List all API keys for a user
   * Reconstructs the full HMAC-signed keys for MCP integration
   */
  async listKeysForUser(ownerId: string): Promise<ApiKeyListItem[]> {
    if (!ownerId) {
      throw new Error("Owner ID is required");
    }

    const apiKeySecret = process.env.API_KEY_SECRET ?? process.env.JWT_SECRET;
    if (!apiKeySecret) {
      throw new Error(
        "API_KEY_SECRET or JWT_SECRET environment variable is required",
      );
    }

    const keys = await uploadApiKeyModel.findByUserId(ownerId);

    return keys.map((key) => {
      // Reconstruct full HMAC-signed key from stored payload
      const payload = key.apiKey;
      const signature = crypto
        .createHmac("sha256", apiKeySecret)
        .update(payload)
        .digest("hex");
      const fullApiKey = `${payload}.${signature}`;

      return {
        id: key.id,
        projectId: key.projectId,
        projectName: key.project.name,
        apiKey: fullApiKey,
        isActive: key.isActive,
        createdAt: key.createdAt,
        updatedAt: key.updatedAt,
      };
    });
  },

  /**
   * Revoke an API key (set isActive to false)
   */
  async revokeKey(keyId: string, ownerId: string): Promise<void> {
    if (!keyId || !ownerId) {
      throw new Error("Key ID and owner ID are required");
    }

    // Verify the key exists and belongs to the user
    const key = await uploadApiKeyModel.findById(keyId);

    if (!key) {
      throw new Error("API key not found");
    }

    if (key.ownerId !== ownerId) {
      throw new Error("Unauthorized: You can only revoke your own API keys");
    }

    await uploadApiKeyModel.revoke(keyId);
  },
};
