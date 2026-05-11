// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { Router } from "express";
import { projectController } from "@/controllers/projectController";
import { dashboardController } from "@/controllers/dashboardController";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();

// Get all projects (requires authentication)
router.get("/v2/projects", authMiddleware, projectController.getProjects);

// Get project by ID (requires authentication)
router.get(
  "/v2/projects/:id",
  authMiddleware,
  projectController.getProjectById,
);

// Create new project (requires authentication)
router.post("/v2/projects", authMiddleware, projectController.createProject);

// Update project (requires authentication)
router.put("/v2/projects/:id", authMiddleware, projectController.updateProject);

// Delete project (requires authentication)
router.delete(
  "/v2/projects/:id",
  authMiddleware,
  projectController.deleteProject,
);

// Get dashboard data (requires authentication)
router.get(
  "/v2/projects/:projectId/dashboard",
  authMiddleware,
  dashboardController.getDashboard,
);

export default router;
