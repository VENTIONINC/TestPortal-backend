import { Router } from "express";
import { resultController } from "@/controllers/resultController";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();

router.get("/v2/results", authMiddleware, resultController.getResults);
router.get("/v2/results/:resultId", authMiddleware, resultController.getResultById);
router.get("/v2/results-stats", authMiddleware, resultController.getResultsStats);
router.patch("/v2/results/:resultId/analysis", authMiddleware, resultController.updateAnalysis);

export default router;

