// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

const aiOperationConfigFields = {
  model: z.string().trim().min(1),
  api: z.enum(["chat-completions", "responses"]).default("chat-completions"),
  temperature: z.number().finite().min(0).max(2).optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  reasoningEffort: z.enum(["none", "low", "medium", "high"]).optional(),
};

const aiOperationConfigObjectSchema = z
  .object(aiOperationConfigFields)
  .strict();

const decisionsClassificationConfigSchema = z
  .object({ model: z.string().trim().min(1) })
  .strict();

const validateGenerativeSettings = (operation: {
  temperature?: number | undefined;
  reasoningEffort?: string | undefined;
}) =>
  !(
    operation.temperature !== undefined &&
    operation.reasoningEffort !== undefined
  );

export const aiOperationConfigSchema = aiOperationConfigObjectSchema.refine(
  validateGenerativeSettings,
  {
    message: "temperature cannot be combined with reasoningEffort",
    path: ["temperature"],
  },
);

export const aiClassificationConfigSchema = z
  .object({
    ...aiOperationConfigFields,
    decisions: decisionsClassificationConfigSchema.optional(),
  })
  .strict()
  .refine(validateGenerativeSettings, {
    message: "temperature cannot be combined with reasoningEffort",
    path: ["temperature"],
  });

export const aiConfigSchema = z
  .object({
    version: z.literal(1),
    operations: z
      .object({
        classification: aiClassificationConfigSchema,
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
export type AiClassificationConfig = z.infer<
  typeof aiClassificationConfigSchema
>;
export type AiConfig = z.infer<typeof aiConfigSchema>;
