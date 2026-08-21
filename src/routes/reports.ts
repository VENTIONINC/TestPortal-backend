// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Router } from "express";
import { authMiddleware } from "@/middleware/authMiddleware";
import { aiInsightsRateLimit } from "@/middleware/aiRateLimit";
import { validatePdfExport } from "@/middleware/validatePdfExport";
import { reportController } from "@/controllers/reportController";

const router = Router();

router.post(
  "/v2/reports/pdf-export",
  authMiddleware,
  aiInsightsRateLimit,
  validatePdfExport,
  reportController.exportPdf,
);

export default router;
