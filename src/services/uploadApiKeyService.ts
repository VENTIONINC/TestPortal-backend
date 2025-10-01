import { uploadApiKeyModel } from "@/models/uploadApiKeyModel";
import argon2 from "argon2";
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
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ValidatedApiKey {
  projectId: string;
  ownerId: string;
  keyId: string;
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

    // Generate random 32-byte API key
    const plainApiKey = crypto.randomBytes(32).toString("hex");

    // Hash the API key using Argon2 (same config as passwords)
    const hashedApiKey = await argon2.hash(plainApiKey, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
    });

    // Save hashed key to database
    const apiKeyRecord = await uploadApiKeyModel.create({
      apiKey: hashedApiKey,
      projectId,
      ownerId,
    });

    // Return the plain text key (only time it's visible)
    return {
      id: apiKeyRecord.id,
      projectId: apiKeyRecord.projectId,
      ownerId: apiKeyRecord.ownerId,
      apiKey: plainApiKey, // Plain text - never stored
      createdAt: apiKeyRecord.createdAt,
    };
  },

  /**
   * Validate an API key and return project/owner information
   * Note: Since Argon2 uses salts, we must verify against all active keys
   * This is a known tradeoff for security - we can't lookup by hash directly
   */
  async validateApiKey(plainApiKey: string): Promise<ValidatedApiKey> {
    if (!plainApiKey) {
      throw new Error("API key is required");
    }

    // Get all active API keys
    const activeKeys = await uploadApiKeyModel.findAllActive();

    // Try to verify against each hashed key
    for (const keyRecord of activeKeys) {
      try {
        const isValid = await argon2.verify(keyRecord.apiKey, plainApiKey);
        if (isValid) {
          return {
            projectId: keyRecord.projectId,
            ownerId: keyRecord.ownerId,
            keyId: keyRecord.id,
          };
        }
      } catch (error) {
        // Continue to next key if verification fails
        continue;
      }
    }

    // No matching key found
    throw new Error("Invalid API key");
  },

  /**
   * List all API keys for a user (without revealing the actual key)
   */
  async listKeysForUser(ownerId: string): Promise<ApiKeyListItem[]> {
    if (!ownerId) {
      throw new Error("Owner ID is required");
    }

    const keys = await uploadApiKeyModel.findByUserId(ownerId);

    return keys.map((key) => ({
      id: key.id,
      projectId: key.projectId,
      projectName: key.project.name,
      isActive: key.isActive,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
    }));
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
