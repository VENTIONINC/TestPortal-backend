import { Router } from "express";
import { jsonReportController } from "@/controllers/jsonReportController";
import { uploadJsonReport } from "@/middleware/fileUploadMiddleware";
import { apiKeyMiddleware } from "@/middleware/apiKeyMiddleware";

const router = Router();

// POST route for processing JSON test reports with API key authentication
router.post("/v2/json-report", apiKeyMiddleware, jsonReportController.processReport);

// POST route for uploading and processing raw JSON report files with API key authentication
router.post(
  "/v2/json-report/upload",
  apiKeyMiddleware,
  uploadJsonReport,
  jsonReportController.processRawReportFile,
);

// POST route for processing raw JSON reports (without file upload) with API key authentication
router.post("/v2/json-report/raw", apiKeyMiddleware, jsonReportController.processRawReport);

export default router;