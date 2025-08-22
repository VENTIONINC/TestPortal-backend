import { Router } from "express";
import { executionController } from "@/controllers/executionController";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();

router.get("/v1/executions/:executionId", authMiddleware, executionController.getExecutionById);

export default router;
