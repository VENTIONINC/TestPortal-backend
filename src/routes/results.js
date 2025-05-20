import { Router } from "express";
import { resultController } from "../controllers/resultController.js";

const router = Router();

router.get("/results", resultController.getResults);
router.get("/results/:resultId", resultController.getResultById);

export default router;
