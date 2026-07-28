// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Router } from "express";
import { userController } from "@/controllers/userController";
import { authMiddleware, requireRole } from "@/middleware/authMiddleware";

const router = Router();

// PUBLIC ROUTES
router.get("/v2/auth/config", userController.getAuthConfig);
router.post("/v2/auth/signup", userController.authSignup);
router.post("/v2/auth/login", userController.authLogin);
router.post("/v2/auth/refresh-token", userController.refreshToken);
router.post("/v2/auth/logout", userController.authLogout);

router.post("/v2/users/refresh-token", userController.refreshToken);

// Compatibility authentication routes
router.post("/v2/users/signup", userController.authSignup);
router.post("/v2/users/login", userController.authLogin);
router.post("/v2/users/signout", userController.authLogout);

// PROTECTED ROUTES
router.get("/v2/users/:userId", authMiddleware, userController.getUserById);
router.patch("/v2/users/:userId", authMiddleware, userController.updateUser);
router.patch(
  "/v2/users/:userId/integrations",
  authMiddleware,
  userController.updateUserIntegrations,
);

// MCP TOKEN ROUTES
router.post(
  "/v2/users/:userId/mcp-token",
  authMiddleware,
  userController.generateMcpToken,
);
router.delete(
  "/v2/users/:userId/mcp-token",
  authMiddleware,
  userController.revokeMcpToken,
);

// ADMIN USER MANAGEMENT ROUTES
router.get(
  "/v2/admin/users",
  authMiddleware,
  requireRole("admin"),
  userController.listUsers,
);
router.post(
  "/v2/admin/users/:userId/approve",
  authMiddleware,
  requireRole("admin"),
  userController.approveUser,
);
router.post(
  "/v2/admin/users/:userId/suspend",
  authMiddleware,
  requireRole("admin"),
  userController.suspendUser,
);
router.post(
  "/v2/admin/users/:userId/restore",
  authMiddleware,
  requireRole("admin"),
  userController.restoreUser,
);
router.patch(
  "/v2/admin/users/:userId/role",
  authMiddleware,
  requireRole("admin"),
  userController.changeUserRole,
);

export default router;
