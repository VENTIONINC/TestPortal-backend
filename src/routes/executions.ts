import { Router } from "express";
import { executionController } from "@/controllers/executionController";

const router = Router();

router.get("/v1/executions/:executionId", executionController.getExecutionById);

export default router;
