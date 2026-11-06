// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0


import { Router } from "express";
import { authMiddleware } from "@/middleware/authMiddleware";
import { manualRunEnvironmentProfileController as controller } from "@/controllers/manualRunEnvironmentProfileController";

const router = Router();
router.get("/v2/projects/:projectId/manual-run-environment-profiles", authMiddleware, controller.list);
router.post("/v2/projects/:projectId/manual-run-environment-profiles", authMiddleware, controller.create);
router.patch("/v2/projects/:projectId/manual-run-environment-profiles/:profileId", authMiddleware, controller.update);
router.delete("/v2/projects/:projectId/manual-run-environment-profiles/:profileId", authMiddleware, controller.remove);
export default router;
