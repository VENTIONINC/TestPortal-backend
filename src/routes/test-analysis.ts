import { Router } from "express";
import { testAnalysisController } from "@/controllers/testAnalysisController";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();

router.post(
  "/v1/test-analysis/analyze",
  authMiddleware,
  testAnalysisController.analyzeTestResults,
);

export default router;
