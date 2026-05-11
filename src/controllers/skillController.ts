// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import type { Request, Response } from "express";

import {
  SkillArtifactError,
  skillArtifactService,
} from "@/services/skillArtifactService";

export class SkillController {
  static async listSkills(_req: Request, res: Response): Promise<void> {
    try {
      const skills = await skillArtifactService.listSkills();
      res.json({ skills });
    } catch (error) {
      SkillController.handleError("Error listing skills:", error, res);
    }
  }

  static async getSkill(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;

      if (!name) {
        res.status(400).json({ error: "Skill name is required" });
        return;
      }

      const skill = await skillArtifactService.getSkill(name);

      if (!skill) {
        res.status(404).json({ error: "Skill not found" });
        return;
      }

      res.json(skill);
    } catch (error) {
      SkillController.handleError("Error getting skill:", error, res);
    }
  }

  static async downloadSkill(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;

      if (!name) {
        res.status(400).json({ error: "Skill name is required" });
        return;
      }

      const download = await skillArtifactService.downloadSkill(name);

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
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const { name } = req.params;

      if (!name) {
        res.status(400).json({ error: "Skill name is required" });
        return;
      }

      const archive = await skillArtifactService.downloadSkillArchive(name);

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

    if (
      error instanceof SkillArtifactError &&
      error.code === "INVALID_ARTIFACT"
    ) {
      res.status(500).json({ error: "Configured skill artifact is invalid" });
      return;
    }

    res.status(500).json({ error: "Internal server error" });
  }
}
