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
router.post(
  "/v2/test-scenarios/:scenarioId/spec-links",
  authMiddleware,
  testScenarioController.addSpecLink,
);
router.get(
  "/v2/test-scenarios/:scenarioId/spec-links",
  authMiddleware,
  testScenarioController.listSpecLinks,
);
router.delete(
  "/v2/test-scenarios/:scenarioId/spec-links/:specId",
  authMiddleware,
  testScenarioController.removeSpecLink,
);
router.get(
  "/v2/test-scenarios/:scenarioId/results",
  authMiddleware,
  testScenarioController.getResults,
);
router.get(
  "/v2/test-scenarios/:scenarioId/issues",
  authMiddleware,
  testScenarioController.getIssues,
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
