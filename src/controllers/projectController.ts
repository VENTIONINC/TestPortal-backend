// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { projectService } from "@/services/projectService";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";
import {
  DEFAULT_PROJECT_CATEGORY_WEIGHTS,
  parseProjectCategoryWeights,
  type ProjectCategoryWeights,
} from "@/lib/projectCategoryWeights";

type ProjectIdParams = {
  id: string;
};

export const projectController = {
  async getProjects(_req: Request, res: Response): Promise<void> {
    try {
      const projects = await projectService.getProjects({});
      res.json(projects);
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ error: err.message });
    }
  },

  async getProjectById(
    req: Request<ProjectIdParams>,
    res: Response,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const projectId = id;

      if (!projectId || typeof projectId !== "string") {
        res.status(400).json({ error: "Invalid project ID" });
        return;
      }

      const project = await projectService.getProjectById(id);

      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      res.json(project);
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ error: err.message });
    }
  },

  async createProject(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const { name, description, categoryWeights } = req.body;

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        res.status(400).json({ error: "Project name is required" });
        return;
      }
      if (description && typeof description !== "string") {
        res.status(400).json({ error: "Description must be a string" });
        return;
      }

      let parsedCategoryWeights: ProjectCategoryWeights | undefined;
      try {
        parsedCategoryWeights =
          categoryWeights === undefined
            ? undefined
            : parseProjectCategoryWeights(categoryWeights);
      } catch (error) {
        const err = error as Error;
        res.status(400).json({ error: err.message });
        return;
      }

      const project = await projectService.createProject({
        name: name.trim(),
        description: description?.trim() ?? "",
        ownerId: req.user.id,
        categoryWeights:
          parsedCategoryWeights ?? DEFAULT_PROJECT_CATEGORY_WEIGHTS,
      });

      res.status(201).json(project);
    } catch (error) {
      const err = error as Error;
      if (err.message.includes("already exists")) {
        res.status(409).json({ error: err.message });
      } else {
        res.status(500).json({ error: err.message });
      }
    }
  },

  async updateProject(
    req: Request<ProjectIdParams>,
    res: Response,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const projectId = id;

      if (!projectId || typeof projectId !== "string") {
        res.status(400).json({ error: "Invalid project ID" });
        return;
      }

      const { name, description, isActive, categoryWeights } = req.body;
      const updateData: {
        name?: string;
        description?: string;
        isActive?: boolean;
        categoryWeights?: ProjectCategoryWeights;
      } = {};

      if (name !== undefined) {
        if (typeof name !== "string" || name.trim().length === 0) {
          res
            .status(400)
            .json({ error: "Project name must be a non-empty string" });
          return;
        }
        updateData.name = name.trim();
      }

      if (description !== undefined) {
        updateData.description =
          typeof description === "string" ? description.trim() : description;
      }

      if (isActive !== undefined) {
        if (typeof isActive !== "boolean") {
          res.status(400).json({ error: "isActive must be a boolean" });
          return;
        }
        updateData.isActive = isActive;
      }

      if (categoryWeights !== undefined) {
        try {
          updateData.categoryWeights =
            parseProjectCategoryWeights(categoryWeights);
        } catch (error) {
          const err = error as Error;
          res.status(400).json({ error: err.message });
          return;
        }
      }

      const project = await projectService.updateProject(id, updateData);
      res.json(project);
    } catch (error) {
      const err = error as Error;
      if (err.message.includes("already exists")) {
        res.status(409).json({ error: err.message });
      } else if (err.message.includes("not found")) {
        res.status(404).json({ error: err.message });
      } else {
        res.status(500).json({ error: err.message });
      }
    }
  },

  async deleteProject(
    req: Request<ProjectIdParams>,
    res: Response,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const projectId = id;

      if (!projectId || typeof projectId !== "string") {
        res.status(400).json({ error: "Invalid project ID" });
        return;
      }

      await projectService.deleteProject(id);
      res.status(204).send();
    } catch (error) {
      const err = error as Error;
      if (err.message.includes("not found")) {
        res.status(404).json({ error: err.message });
      } else {
        res.status(500).json({ error: err.message });
      }
    }
  },
};
