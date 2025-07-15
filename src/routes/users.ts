import { Router } from "express";
import { userController } from "@/controllers/userController";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();

// PUBLIC ROUTES
router.post("/v2/users/signup", userController.signup);
router.post("/v2/users/login", userController.login);
router.post("/v2/users/refresh-token", userController.refreshToken);

// PROTECTED ROUTES
router.get("/v2/users/:userId", authMiddleware, userController.getUserById);
router.patch("/v2/users/:userId", authMiddleware, userController.updateUser);

// MCP TOKEN ROUTES
router.post("/v2/users/:userId/mcp-token", authMiddleware, userController.generateMcpToken);
router.delete("/v2/users/:userId/mcp-token", authMiddleware, userController.revokeMcpToken);

export default router;
