import { Router } from "express";
import { executionController } from "@/controllers/executionController";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();

router.get(
  "/v2/executions/:executionId",
  authMiddleware,
  executionController.getExecutionById,
);
router.post(
  "/v2/executions/:executionId/group-failures",
  authMiddleware,
  executionController.groupFailures,
);
router.post(
  "/v2/executions/:executionId/group-failures/accept",
  authMiddleware,
  executionController.acceptGroup,
);
router.delete(
  "/v2/executions/:executionId",
  authMiddleware,
  executionController.deleteExecution,
);

export default router;
