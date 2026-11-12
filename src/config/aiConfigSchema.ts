// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

export const aiOperationConfigSchema = z
  .object({
    model: z.string().trim().min(1),
    api: z.enum(["chat-completions", "responses"]).default("chat-completions"),
    temperature: z.number().finite().min(0).max(2).optional(),
    maxOutputTokens: z.number().int().positive().optional(),
    reasoningEffort: z.enum(["none", "low", "medium", "high"]).optional(),
  })
  .strict()
  .refine(
    (operation) =>
      !(
        operation.temperature !== undefined &&
        operation.reasoningEffort !== undefined
      ),
    {
      message: "temperature cannot be combined with reasoningEffort",
      path: ["temperature"],
    },
  );

export const aiConfigSchema = z
  .object({
    version: z.literal(1),
    operations: z
      .object({
        classification: aiOperationConfigSchema,
        formatting: aiOperationConfigSchema,
        suggestions: aiOperationConfigSchema,
        insights: aiOperationConfigSchema,
      })
      .strict(),
  })
  .strict();

export type AiOperationName = keyof z.infer<
  typeof aiConfigSchema
>["operations"];
export type AiOperationConfig = z.infer<typeof aiOperationConfigSchema>;
export type AiConfig = z.infer<typeof aiConfigSchema>;
