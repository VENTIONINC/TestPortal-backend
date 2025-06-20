import { Router } from "express";
import { openRouterController } from "@/controllers/openRouterController";

const router = Router();

router.post("/v1/openrouter/analyze", openRouterController.analyzeTestResults);

export default router; 