// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { json, Router } from "express";
import {
  manualTestRunCreationController,
  type ManualTestRunCreationRequest,
} from "@/controllers/manualTestRunCreationController";
import { manualTestRunHistoryController } from "@/controllers/manualTestRunHistoryController";
import { manualTestRunLifecycleController } from "@/controllers/manualTestRunLifecycleController";
import { manualTestRunMutationController } from "@/controllers/manualTestRunMutationController";
import { authMiddleware } from "@/middleware/authMiddleware";
import { manualTestRunJsonRoutes } from "@/middleware/json-body";

const router = Router();
const { create, updateDetails, reorder, bulkUpdate } = manualTestRunJsonRoutes;

router[create.method](
  create.path,
  authMiddleware,
  json({ limit: create.limit }),
  (req, res) =>
    manualTestRunCreationController.create(
      req as ManualTestRunCreationRequest,
      res,
    ),
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
router[updateDetails.method](
  updateDetails.path,
  authMiddleware,
  json({ limit: updateDetails.limit }),
  manualTestRunMutationController.updateDetails,
);
router.patch(
  "/v2/manual-test-runs/:runId/scenarios/:scenarioId/evidence",
  authMiddleware,
  manualTestRunMutationController.updateScenarioEvidence,
);
router[reorder.method](
  reorder.path,
  authMiddleware,
  json({ limit: reorder.limit }),
  manualTestRunMutationController.reorder,
);
router[bulkUpdate.method](
  bulkUpdate.path,
  authMiddleware,
  json({ limit: bulkUpdate.limit }),
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
