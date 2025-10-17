import { Router } from "express";
import { specController } from "@/controllers/specController";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();

router.get("/v2/specs/:specId", authMiddleware, specController.getSpecById);

export default router;
