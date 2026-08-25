// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Router } from "express";
import { testScenarioController } from "@/controllers/testScenarioController";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();

router.post(
  "/v2/test-scenarios",
  authMiddleware,
  testScenarioController.create,
);
router.get(
  "/v2/test-scenarios",
  authMiddleware,
  testScenarioController.list,
);
router.get(
  "/v2/test-scenarios/:scenarioId",
  authMiddleware,
  testScenarioController.getById,
);
router.delete(
  "/v2/test-scenarios/:scenarioId",
  authMiddleware,
  testScenarioController.delete,
);

export default router;
