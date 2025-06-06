import { Router } from "express";
import { specController } from "@/controllers/specController";

const router = Router();

router.get("/v1/specs/:specId", specController.getSpecById);

export default router;
