// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Router } from "express";
import { manualTestRunCreationController } from "@/controllers/manualTestRunCreationController";
import { manualTestRunHistoryController } from "@/controllers/manualTestRunHistoryController";
import { manualTestRunLifecycleController } from "@/controllers/manualTestRunLifecycleController";
import { manualTestRunMutationController } from "@/controllers/manualTestRunMutationController";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();

router.post(
  "/v2/manual-test-runs",
  authMiddleware,
  manualTestRunCreationController.create,
);
router.get(
  "/v2/manual-test-runs",
  authMiddleware,
  manualTestRunHistoryController.list,
);
router.get(
  "/v2/manual-test-runs/:runId",
  authMiddleware,
  manualTestRunHistoryController.getById,
);
router.delete(
  "/v2/manual-test-runs/:runId",
  authMiddleware,
  manualTestRunLifecycleController.delete,
);
router.put(
  "/v2/manual-test-runs/:runId/scenarios/order",
  authMiddleware,
  manualTestRunMutationController.reorder,
);
router.post(
  "/v2/manual-test-runs/:runId/scenarios/bulk",
  authMiddleware,
  manualTestRunMutationController.bulkUpdate,
);
router.put(
  "/v2/manual-test-runs/:runId/scenarios/:scenarioId/result",
  authMiddleware,
  manualTestRunMutationController.updateResult,
);
router.patch(
  "/v2/manual-test-runs/:runId/scenarios/:scenarioId/assignee",
  authMiddleware,
  manualTestRunMutationController.updateAssignee,
);
router.post(
  "/v2/manual-test-runs/:runId/complete",
  authMiddleware,
  manualTestRunLifecycleController.complete,
);
router.post(
  "/v2/manual-test-runs/:runId/reopen",
  authMiddleware,
  manualTestRunLifecycleController.reopen,
);

export default router;
