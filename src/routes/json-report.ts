// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Router } from "express";
import { jsonReportController } from "@/controllers/jsonReportController";
import {
  uploadJsonReport,
  uploadErrorHandler,
} from "@/middleware/fileUploadMiddleware";
import { authMiddleware } from "@/middleware/authMiddleware";
import { apiKeyMiddleware } from "@/middleware/apiKeyMiddleware";

const router = Router();

// POST route for uploading and processing raw JSON report files
router.post(
  "/v2/upload-json-report",
  authMiddleware,
  uploadJsonReport,
  uploadErrorHandler,
  jsonReportController.processRawReportFile,
);

// POST route for uploading and processing raw JSON report files with API key authentication
router.post(
  "/v2/upload-json-report-api-key",
  apiKeyMiddleware,
  uploadJsonReport,
  uploadErrorHandler,
  jsonReportController.processRawReportFileWithApiKey,
);

export default router;
