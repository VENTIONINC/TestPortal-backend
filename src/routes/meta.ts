import { Router } from "express";
import { metaController } from "@/controllers/metaController";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();

router.get("/v2/meta", authMiddleware, metaController.getMeta);

export default router;
