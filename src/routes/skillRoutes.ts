// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { Router } from "express";

import { SkillController } from "@/controllers/skillController";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();

router.get("/v2/skills", authMiddleware, SkillController.listSkills);
router.get("/v2/skills/:name", authMiddleware, SkillController.getSkill);
router.get(
  "/v2/skills/:name/download",
  authMiddleware,
  SkillController.downloadSkill,
);
router.get(
  "/v2/skills/:name/archive",
  authMiddleware,
  SkillController.downloadSkillArchive,
);

export default router;
