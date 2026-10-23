// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

const nonblankString = z.string().trim().min(1);

const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
);

const textStateSchema = z.string();
const objectStateSchema = z.record(jsonValueSchema);

export const openRouterStateSchema = z.union([
  textStateSchema,
  objectStateSchema,
  z.array(jsonValueSchema),
]);

export const openRouterProviderRoutingSchema = z
  .object({ allow_fallbacks: z.literal(false) })
  .strict();

export const openRouterNoulQuestionSchema = z
  .object({
    type: z.literal("noul"),
    instructions: nonblankString,
    criteria: z
      .object({
        false: nonblankString,
        true: nonblankString,
      })
      .strict()
      .optional(),
  })
  .strict();

export const openRouterChoiceQuestionSchema = z
  .object({
    type: z.literal("choice"),
    instructions: nonblankString,
    criteria: z
      .record(nonblankString)
      .refine((criteria) => Object.keys(criteria).length <= 255, "choice criteria must contain no more than 255 options")
      .refine(
        (criteria) => Object.keys(criteria).length >= 2,
        "choice criteria must contain at least two options",
      )
      .refine(
        (criteria) => Object.keys(criteria).every((key) => key.trim().length > 0),
        "choice criteria names must not be blank",
      ),
  })
  .strict();

export const openRouterScoreQuestionSchema = z
  .object({
    type: z.literal("score"),
    instructions: nonblankString,
    criteria: z.array(nonblankString).min(2).max(10),
  })
  .strict();

export const openRouterQuestionSchema = z.discriminatedUnion("type", [
  openRouterNoulQuestionSchema,
  openRouterChoiceQuestionSchema,
  openRouterScoreQuestionSchema,
]);

export const openRouterDecisionsRequestSchema = z
  .object({
    model: nonblankString,
    state: openRouterStateSchema,
    provider: openRouterProviderRoutingSchema.optional(),
    questions: z
      .record(openRouterQuestionSchema)
      .refine(
        (questions) => Object.keys(questions).length > 0,
        "at least one named question is required",
      )
      .refine(
        (questions) => Object.keys(questions).every((key) => key.trim().length > 0),
        "question names must not be blank",
      ),
  })
  .strict();

export type OpenRouterState = z.infer<typeof openRouterStateSchema>;
export type OpenRouterNoulQuestion = z.infer<
  typeof openRouterNoulQuestionSchema
>;
export type OpenRouterChoiceQuestion = z.infer<
  typeof openRouterChoiceQuestionSchema
>;
export type OpenRouterScoreQuestion = z.infer<
  typeof openRouterScoreQuestionSchema
>;
export type OpenRouterQuestion = z.infer<typeof openRouterQuestionSchema>;
export type OpenRouterDecisionsRequest = z.infer<
  typeof openRouterDecisionsRequestSchema
>;
