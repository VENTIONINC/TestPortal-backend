import { Router } from "express";
import { jsonReportController } from "@/controllers/jsonReportController";
import { uploadJsonReport } from "@/middleware/fileUploadMiddleware";
import { authMiddleware } from "@/middleware/authMiddleware";
import { apiKeyMiddleware } from "@/middleware/apiKeyMiddleware";

const router = Router();

router.post(
  "/v1/json-report",
  authMiddleware,
  jsonReportController.processReport,
);

// POST route for uploading and processing raw JSON report files
router.post(
  "/v1/json-report/upload",
  authMiddleware,
  uploadJsonReport,
  jsonReportController.processRawReportFile,
);

// POST route for uploading and processing raw JSON report files with API key authentication
router.post(
  "/v2/json-report/upload",
  apiKeyMiddleware,
  uploadJsonReport,
  jsonReportController.processRawReportFileWithApiKey,
);

export default router;
