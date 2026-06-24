// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Router } from "express";
import { PromptController } from "@/controllers/promptController";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();

router.get("/v2/prompts", authMiddleware, PromptController.listPrompts);
router.get("/v2/prompts/:name", authMiddleware, PromptController.getPrompt);
router.post(
  "/v2/prompts/:name/generate",
  authMiddleware,
  PromptController.generatePrompt,
);

export default router;
