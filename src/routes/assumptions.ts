import { Router } from "express";
import { assumptionController } from "@/controllers/assumptionController";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();

router.post("/v1/assumptions", authMiddleware, assumptionController.createAssumption);
router.patch(
  "/v1/assumptions/:assumptionId",
  authMiddleware,
  assumptionController.updateAssumption,
);
router.get(
  "/v1/assumptions/:assumptionId",
  authMiddleware,
  assumptionController.getAssumptionById,
);

export default router;
