import { Router } from "express";
import { PromptController } from "@/controllers/promptController";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();

router.get("/prompts", authMiddleware, PromptController.listPrompts);
router.get("/prompts/:name", authMiddleware, PromptController.getPrompt);
router.post(
  "/prompts/:name/generate",
  authMiddleware,
  PromptController.generatePrompt,
);

export default router;
