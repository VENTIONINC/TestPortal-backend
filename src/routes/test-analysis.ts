import { Router } from "express";
import { testAnalysisController } from "@/controllers/testAnalysisController";

const router = Router();

router.post(
  "/v1/test-analysis/analyze",
  testAnalysisController.analyzeTestResults,
);

export default router;
