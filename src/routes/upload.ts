import { Router } from "express";
import { uploadApiKeyController } from "@/controllers/uploadApiKeyController";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();

// Generate new API key for a project (JWT auth required)
router.post("/v2/upload/generate-key", authMiddleware, uploadApiKeyController.generateKey);

// List all API keys for the authenticated user (JWT auth required)
router.get("/v2/upload/keys", authMiddleware, uploadApiKeyController.listKeys);

// Revoke an API key (JWT auth required)
router.delete("/v2/upload/keys/:id", authMiddleware, uploadApiKeyController.revokeKey);

export default router;
