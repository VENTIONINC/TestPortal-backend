import { Router } from "express";
import { resultController } from "@/controllers/resultController";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();

router.get(
  "/v2/analysis-export",
  authMiddleware,
  resultController.exportAnalysisJsonl,
);

export default router;
