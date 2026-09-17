// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Router } from "express";
import { manualTestRunController } from "@/controllers/manualTestRunController";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();

router.post(
  "/v2/test-scenarios/:scenarioId/manual-runs",
  authMiddleware,
  manualTestRunController.start,
);
router.get(
  "/v2/test-scenarios/:scenarioId/manual-runs",
  authMiddleware,
  manualTestRunController.listByScenario,
);
router.get(
  "/v2/manual-test-runs",
  authMiddleware,
  manualTestRunController.listByProject,
);
router.get(
  "/v2/manual-test-runs/:runId",
  authMiddleware,
  manualTestRunController.getById,
);
router.patch(
  "/v2/manual-test-runs/:runId",
  authMiddleware,
  manualTestRunController.update,
);
router.patch(
  "/v2/manual-test-runs/:runId/steps/:stepId",
  authMiddleware,
  manualTestRunController.updateStep,
);
router.post(
  "/v2/manual-test-runs/:runId/complete",
  authMiddleware,
  manualTestRunController.complete,
);

export default router;
