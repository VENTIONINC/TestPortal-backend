import { Router } from "express";
import { assumptionController } from "@/controllers/assumptionController";

const router = Router();

router.post("/assumptions", assumptionController.createAssumption);
router.patch(
  "/assumptions/:assumptionId",
  assumptionController.updateAssumption,
);
router.get(
  "/assumptions/:assumptionId",
  assumptionController.getAssumptionById,
);

export default router;
