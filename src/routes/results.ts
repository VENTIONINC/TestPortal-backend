import { Router } from "express";
import { resultController } from "@/controllers/resultController";

const router = Router();

router.get("/v1/results", resultController.getResults);
router.get("/v1/results/:resultId", resultController.getResultById);

export default router;
