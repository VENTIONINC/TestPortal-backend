import { z } from "zod";

export const failureGroupingGroupSchema = z.object({
  resultErrorIds: z.array(z.string()).min(1),
  groupDescription: z.string(),
  confidence: z.number().min(0).max(1),
  suggestedIssueQuery: z.string().optional(),
});

export const failureGroupingResponseSchema = z.object({
  groups: z.array(failureGroupingGroupSchema),
});

export type FailureGroupingPromptGroup = z.infer<
  typeof failureGroupingGroupSchema
>;

export type FailureGroupingPromptResponse = z.infer<
  typeof failureGroupingResponseSchema
>;
