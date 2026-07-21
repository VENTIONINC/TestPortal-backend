// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Router } from "express";
import { errorFormatterController } from "@/controllers/errorFormatterController";
import { authMiddleware } from "@/middleware/authMiddleware";
import { aiRateLimit } from "@/middleware/aiRateLimit";

const router = Router();

router.post(
  "/v2/error-formatter",
  authMiddleware,
  aiRateLimit,
  errorFormatterController.formatError,
);
router.post(
  "/v2/error-formatter/result",
  authMiddleware,
  aiRateLimit,
  errorFormatterController.suggestFromResult,
);

export default router;
