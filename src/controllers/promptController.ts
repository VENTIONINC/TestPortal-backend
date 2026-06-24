// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { Request, Response } from "express";
import { PromptParameterService } from "@/services/promptParameterService";

type PromptNameParams = {
  name: string;
};

export class PromptController {
  static async listPrompts(_req: Request, res: Response): Promise<void> {
    try {
      const prompts = PromptParameterService.getAllPrompts();
      res.json({ prompts });
    } catch (error) {
      console.error("Error listing prompts:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async getPrompt(
    req: Request<PromptNameParams>,
    res: Response,
  ): Promise<void> {
    try {
      const { name } = req.params;

      if (!name) {
        res.status(400).json({ error: "Prompt name is required" });
        return;
      }

      const prompt = PromptParameterService.getPrompt(name);

      if (!prompt) {
        res.status(404).json({ error: "Prompt not found" });
        return;
      }

      res.json({
        name,
        ...prompt,
      });
    } catch (error) {
      console.error("Error getting prompt:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async generatePrompt(
    req: Request<PromptNameParams>,
    res: Response,
  ): Promise<void> {
    try {
      const { name } = req.params;

      if (!name) {
        res.status(400).json({ error: "Prompt name is required" });
        return;
      }

      const params = req.body ?? {};
      const promptResult = PromptParameterService.generatePrompt(name, params);

      if (!promptResult) {
        res.status(404).json({ error: "Prompt not found" });
        return;
      }

      const content = promptResult.messages[0]?.content;
      const generatedPrompt = content?.type === "text" ? content.text : "";

      res.json({
        name,
        parameters: params,
        generated_prompt: generatedPrompt,
      });
    } catch (error) {
      console.error("Error generating prompt:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

}
