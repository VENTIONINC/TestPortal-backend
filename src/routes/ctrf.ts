import { Router } from "express";
import { ctrfController } from "@/controllers/ctrfController";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();

// Process CTRF report
router.post("/v2/ctrf/report", authMiddleware, ctrfController.processReport);

// Update CTRF report
router.patch("/v2/ctrf/report/:executionId", authMiddleware, ctrfController.updateReport);

export default router;
