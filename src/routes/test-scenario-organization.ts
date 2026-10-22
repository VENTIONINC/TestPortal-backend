// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Router } from "express";
import { testScenarioOrganizationController as controller } from "@/controllers/testScenarioOrganizationController";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();
router.get("/v2/test-scenario-folders", authMiddleware, controller.listFolders);
router.post("/v2/test-scenario-folders", authMiddleware, controller.createFolder);
router.patch("/v2/test-scenario-folders/:folderId", authMiddleware, controller.updateFolder);
router.delete("/v2/test-scenario-folders/:folderId", authMiddleware, controller.deleteFolder);
router.get("/v2/test-suites", authMiddleware, controller.listSuites);
router.post("/v2/test-suites", authMiddleware, controller.createSuite);
router.get("/v2/test-suites/:suiteId", authMiddleware, controller.getSuite);
router.patch("/v2/test-suites/:suiteId", authMiddleware, controller.updateSuite);
router.delete("/v2/test-suites/:suiteId", authMiddleware, controller.deleteSuite);
router.post("/v2/test-suites/:suiteId/members", authMiddleware, controller.addMembers);
router.delete("/v2/test-suites/:suiteId/members", authMiddleware, controller.removeMembers);
router.put("/v2/test-suites/:suiteId/members/order", authMiddleware, controller.orderMembers);
router.patch("/v2/test-scenarios/bulk-folder", authMiddleware, controller.bulkFolder);
export default router;
