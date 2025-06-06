import { Router } from "express";
import { jsonReportController } from "@/controllers/jsonReportController";

const router = Router();

// POST route for processing JSON test reports
router.post("/v1/json-report", jsonReportController.processReport);

export default router;
