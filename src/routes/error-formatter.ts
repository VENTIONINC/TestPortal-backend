import { Router } from "express";
import { errorFormatterController } from "@/controllers/errorFormatterController";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();

router.post("/v2/error-formatter", authMiddleware, errorFormatterController.formatError);

export default router;