import type { Response } from "express";
import { uploadApiKeyService } from "@/services/uploadApiKeyService";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";
import getLogger from "@/lib/logger";

const logger = getLogger("upload-api-key-controller");

export const uploadApiKeyController = {
  /**
   * Generate a new API key for a project
   * POST /api/v2/upload/generate-key?projectId=<uuid>
   */
  async generateKey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          error: "User not authenticated",
        });
        return;
      }

      if (!projectId || typeof projectId !== "string") {
        res.status(400).json({
          error: "Project ID is required as a query parameter",
        });
        return;
      }

      logger.info(
        `Generating API key for project ${projectId} by user ${userId}`,
      );

      const apiKeyData = await uploadApiKeyService.generateApiKey(
        projectId,
        userId,
      );

      const response = {
        success: true,
        message:
          "API key generated successfully. Save this key - it will not be shown again.",
        data: {
          id: apiKeyData.id,
          projectId: apiKeyData.projectId,
          apiKey: apiKeyData.apiKey, // Plain text - only time it's visible
          createdAt: apiKeyData.createdAt,
        },
      };

      res.json(response);
    } catch (error) {
      logger.error("Error generating API key:", error);
      res.status(500).json({
        error: "Failed to generate API key",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  /**
   * List all API keys for the authenticated user
   * GET /api/v2/upload/keys
   */
  async listKeys(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          error: "User not authenticated",
        });
        return;
      }

      logger.info(`Listing API keys for user ${userId}`);

      const keys = await uploadApiKeyService.listKeysForUser(userId);

      res.json({
        success: true,
        data: keys,
      });
    } catch (error) {
      logger.error("Error listing API keys:", error);
      res.status(500).json({
        error: "Failed to list API keys",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  /**
   * Revoke an API key
   * DELETE /api/v2/upload/keys/:id
   */
  async revokeKey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          error: "User not authenticated",
        });
        return;
      }

      if (!id) {
        res.status(400).json({
          error: "API key ID is required",
        });
        return;
      }

      logger.info(`Revoking API key ${id} for user ${userId}`);

      await uploadApiKeyService.revokeKey(id, userId);

      res.json({
        success: true,
        message: "API key revoked successfully",
      });
    } catch (error) {
      logger.error("Error revoking API key:", error);

      if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json({
          error: "API key not found",
          details: error.message,
        });
        return;
      }

      if (error instanceof Error && error.message.includes("Unauthorized")) {
        res.status(403).json({
          error: "Unauthorized",
          details: error.message,
        });
        return;
      }

      res.status(500).json({
        error: "Failed to revoke API key",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};
