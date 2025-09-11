import { Router } from "express";
import { projectController } from "@/controllers/projectController";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();

// Get all projects (requires authentication)
router.get("/v1/projects", authMiddleware, projectController.getProjects);

// Get project by ID (requires authentication)
router.get("/v1/projects/:id", authMiddleware, projectController.getProjectById);

// Create new project (requires authentication)
router.post("/v1/projects", authMiddleware, projectController.createProject);

// Update project (requires authentication)
router.put("/v1/projects/:id", authMiddleware, projectController.updateProject);

// Delete project (requires authentication)
router.delete("/v1/projects/:id", authMiddleware, projectController.deleteProject);

export default router;