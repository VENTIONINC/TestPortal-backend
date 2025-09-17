import { Router } from "express";
import { jsonReportController } from "@/controllers/jsonReportController";
import { uploadJsonReport } from "@/middleware/fileUploadMiddleware";
import { authMiddleware } from "@/middleware/authMiddleware";

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

export default router;
