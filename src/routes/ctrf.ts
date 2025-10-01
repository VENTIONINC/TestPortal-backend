import { Router } from "express";
import { ctrfController } from "@/controllers/ctrfController";
import { authMiddleware } from "@/middleware/authMiddleware";
import { uploadJsonReport } from "@/middleware/fileUploadMiddleware";

const router = Router();

// Process CTRF report
router.post("/v2/ctrf/report", authMiddleware, ctrfController.processReport);

// Upload and process raw CTRF report file
router.post("/v2/ctrf/report/upload", authMiddleware, uploadJsonReport, ctrfController.processRawReportFile);

// Update CTRF report
router.patch("/v2/ctrf/report/:executionId", authMiddleware, ctrfController.updateReport);

export default router;
