// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Router } from "express";

import { SkillController } from "@/controllers/skillController";
import { authMiddleware } from "@/middleware/authMiddleware";
import {
  uploadErrorHandler,
  uploadSkillPackage,
} from "@/middleware/fileUploadMiddleware";

const router = Router();

router.post(
  "/v2/skills",
  authMiddleware,
  uploadSkillPackage,
  uploadErrorHandler,
  SkillController.createCustomSkill,
);
router.put(
  "/v2/skills/:id",
  authMiddleware,
  uploadSkillPackage,
  uploadErrorHandler,
  SkillController.replaceCustomSkill,
);
router.delete(
  "/v2/skills/:id",
  authMiddleware,
  SkillController.deleteCustomSkill,
);
router.get("/v2/skills", authMiddleware, SkillController.listSkills);
router.get("/v2/skills/:id", authMiddleware, SkillController.getSkill);
router.get(
  "/v2/skills/:id/download",
  authMiddleware,
  SkillController.downloadSkill,
);
router.get(
  "/v2/skills/:id/archive",
  authMiddleware,
  SkillController.downloadSkillArchive,
);

export default router;
