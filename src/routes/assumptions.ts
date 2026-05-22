// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { Router } from "express";
import { assumptionController } from "@/controllers/assumptionController";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();

router.post("/v2/assumptions", authMiddleware, assumptionController.createAssumption);
router.patch(
  "/v2/assumptions/:assumptionId",
  authMiddleware,
  assumptionController.updateAssumption,
);
router.get(
  "/v2/assumptions/:assumptionId",
  authMiddleware,
  assumptionController.getAssumptionById,
);
router.delete(
  "/v2/assumptions/:assumptionId",
  authMiddleware,
  assumptionController.deleteAssumption,
);

export default router;
