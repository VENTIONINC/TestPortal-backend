// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { Request, Response } from "express";

import { SkillPackageValidationError } from "@/lib/skills/skillPackage";
import {
  SkillArtifactError,
  SkillMutationError,
  skillArtifactService,
} from "@/services/skillArtifactService";

type SkillIdParams = {
  id: string;
};

export class SkillController {
  static async createCustomSkill(req: Request, res: Response): Promise<void> {
    try {
      const skill = await skillArtifactService.createCustomSkill(
        SkillController.getPackageUploadInput(req),
      );
      res.status(201).json(skill);
    } catch (error) {
      SkillController.handleError("Error creating custom skill:", error, res);
    }
  }

  static async replaceCustomSkill(
    req: Request<SkillIdParams>,
    res: Response,
  ): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "Skill id is required" });
        return;
      }

      const skill = await skillArtifactService.replaceCustomSkill(
        id,
        SkillController.getPackageUploadInput(req),
      );
      res.json(skill);
    } catch (error) {
      SkillController.handleError("Error replacing custom skill:", error, res);
    }
  }

  static async deleteCustomSkill(
    req: Request<SkillIdParams>,
    res: Response,
  ): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "Skill id is required" });
        return;
      }

      await skillArtifactService.deleteCustomSkill(id);
      res.status(204).send();
    } catch (error) {
      SkillController.handleError("Error deleting custom skill:", error, res);
    }
  }

  static async listSkills(_req: Request, res: Response): Promise<void> {
    try {
      const skills = await skillArtifactService.listSkills();
      res.json({ skills });
    } catch (error) {
      SkillController.handleError("Error listing skills:", error, res);
    }
  }

  static async getSkill(
    req: Request<SkillIdParams>,
    res: Response,
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: "Skill id is required" });
        return;
      }

      const skill = await skillArtifactService.getSkill(id);

      if (!skill) {
        res.status(404).json({ error: "Skill not found" });
        return;
      }

      res.json(skill);
    } catch (error) {
      SkillController.handleError("Error getting skill:", error, res);
    }
  }

  static async downloadSkill(
    req: Request<SkillIdParams>,
    res: Response,
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: "Skill id is required" });
        return;
      }

      const download = await skillArtifactService.downloadSkill(id);

      if (!download) {
        res.status(404).json({ error: "Skill not found" });
        return;
      }

      res.set("Content-Type", download.contentType);
      res.set(
        "Content-Disposition",
        `attachment; filename="${download.filename}"`,
      );
      res.send(download.content);
    } catch (error) {
      SkillController.handleError("Error downloading skill:", error, res);
    }
  }

  static async downloadSkillArchive(
    req: Request<SkillIdParams>,
    res: Response,
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: "Skill id is required" });
        return;
      }

      const archive = await skillArtifactService.downloadSkillArchive(id);

      if (!archive) {
        res.status(404).json({ error: "Skill not found" });
        return;
      }

      res.set("Content-Type", archive.contentType);
      res.set(
        "Content-Disposition",
        `attachment; filename="${archive.filename}"`,
      );
      res.send(archive.content);
    } catch (error) {
      SkillController.handleError(
        "Error downloading skill archive:",
        error,
        res,
      );
    }
  }

  private static handleError(
    message: string,
    error: unknown,
    res: Response,
  ): void {
    console.error(message, error);

    if (error instanceof SkillPackageValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }

    if (error instanceof SkillMutationError) {
      const statusByCode = {
        CONFLICT: 409,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        VALIDATION: 400,
      } as const;
      res.status(statusByCode[error.code]).json({ error: error.message });
      return;
    }

    if (
      error instanceof SkillArtifactError &&
      error.code === "INVALID_ARTIFACT"
    ) {
      res.status(500).json({ error: "Configured skill artifact is invalid" });
      return;
    }

    res.status(500).json({ error: "Internal server error" });
  }

  private static getPackageUploadInput(req: Request) {
    if (!req.file) {
      throw new SkillMutationError(
        "A zip skill package is required",
        "VALIDATION",
      );
    }

    return {
      packageBuffer: req.file.buffer,
      title: typeof req.body.title === "string" ? req.body.title : "",
      category: typeof req.body.category === "string" ? req.body.category : "",
    };
  }
}
