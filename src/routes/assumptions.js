import { Router } from "express";
import { assumptionController } from "../controllers/assumptionController.js";

const router = Router();

router.post("/assumptions", assumptionController.createAssumption);
router.patch(
  "/assumptions/:assumptionId",
  assumptionController.updateAssumption,
);

export default router;
