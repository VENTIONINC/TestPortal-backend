// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { Router } from "express";
import { ctrfController } from "@/controllers/ctrfController";
import { authMiddleware } from "@/middleware/authMiddleware";
import { apiKeyMiddleware } from "@/middleware/apiKeyMiddleware";
import {
  uploadJsonReport,
  uploadErrorHandler,
} from "@/middleware/fileUploadMiddleware";

const router = Router();

// Upload and process raw CTRF report file (JWT authentication)
router.post(
  "/v2/upload-ctrf-report",
  authMiddleware,
  uploadJsonReport,
  uploadErrorHandler,
  ctrfController.processRawReportFile,
);

// Upload and process raw CTRF report file (API key authentication)
router.post(
  "/v2/upload-ctrf-report-api-key",
  apiKeyMiddleware,
  uploadJsonReport,
  uploadErrorHandler,
  ctrfController.processRawReportFileWithApiKey,
);

export default router;
