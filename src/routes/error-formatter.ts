import { Router } from "express";
import { errorFormatterController } from "@/controllers/errorFormatterController";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();

router.post(
  "/v2/error-formatter",
  authMiddleware,
  errorFormatterController.formatError,
);
router.post(
  "/v2/error-formatter/result",
  authMiddleware,
  errorFormatterController.suggestFromResult,
);

export default router;
