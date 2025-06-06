import { Router } from "express";
import { assumptionController } from "@/controllers/assumptionController";

const router = Router();

router.post("/v1/assumptions", assumptionController.createAssumption);
router.patch(
  "/v1/assumptions/:assumptionId",
  assumptionController.updateAssumption,
);
router.get(
  "/v1/assumptions/:assumptionId",
  assumptionController.getAssumptionById,
);

export default router;
