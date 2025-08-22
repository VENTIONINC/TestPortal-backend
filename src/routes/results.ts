import { Router } from "express";
import { resultController } from "@/controllers/resultController";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();

router.get("/v1/results", authMiddleware, resultController.getResults);
router.get("/v1/results/:resultId", authMiddleware, resultController.getResultById);
router.get("/v1/results-stats", authMiddleware, resultController.getResultsStats);
router.patch("/v1/results/:resultId/analysis", authMiddleware, resultController.updateAnalysis);

export default router;

