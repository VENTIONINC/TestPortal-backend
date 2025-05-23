import { Router } from "express";
import { executionController } from "@/controllers/executionController";

const router = Router();

router.get("/executions/:executionId", executionController.getExecutionById);

export default router;
