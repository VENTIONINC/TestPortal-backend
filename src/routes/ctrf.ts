import { Router } from "express";
import { ctrfController } from "@/controllers/ctrfController";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();

router.post("/report", authMiddleware, ctrfController.processReport);

export default router;