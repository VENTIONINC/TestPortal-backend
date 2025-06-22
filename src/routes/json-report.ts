import { Router } from "express";
import { jsonReportController } from "@/controllers/jsonReportController";
import { uploadJsonReport } from "@/middleware/fileUploadMiddleware";

const router = Router();

// POST route for processing JSON test reports
router.post("/v1/json-report", jsonReportController.processReport);

// POST route for uploading and processing raw JSON report files
router.post(
  "/v1/json-report/upload",
  uploadJsonReport,
  jsonReportController.processRawReportFile,
);

export default router;

