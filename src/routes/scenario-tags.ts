// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { json, Router } from "express";
import { scenarioTagController as controller } from "@/controllers/scenarioTagController";
import { scenarioTagSelectionRoutes } from "@/middleware/json-body";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();
const path = "/v2/projects/:projectId/scenario-tags";

router.get(path, authMiddleware, controller.list);
router.post(path, authMiddleware, controller.create);
router.patch(`${path}/:tagId`, authMiddleware, controller.edit);

router.post(`${path}/deletion/undo`, authMiddleware, controller.undo);
router.post(`${path}/inline`, authMiddleware, controller.inline);

// Full catalog selections can exceed Express's default JSON body size.
const selectionBody = json({ limit: "2mb" });
for (const action of ["preview", "remove", "assign", "counts"] as const) {
  const { method, path: selectionPath } = scenarioTagSelectionRoutes[action];
  router[method](
    selectionPath,
    authMiddleware,
    selectionBody,
    controller[action],
  );
}

export default router;
