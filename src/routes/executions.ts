// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Router } from "express";
import { executionController } from "@/controllers/executionController";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();

router.get("/v2/executions/:executionId", authMiddleware, executionController.getExecutionById);
router.delete("/v2/executions/:executionId", authMiddleware, executionController.deleteExecution);

export default router;
