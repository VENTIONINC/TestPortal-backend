// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

import type {
  OpenRouterDecisionsRequest,
  OpenRouterQuestion,
} from "./schemas";
import { OpenRouterDecisionsError } from "./transport";

const finiteUnit = z.number().finite().min(0).max(1);
const nonnegativeInteger = z.number().int().nonnegative();
const nonnegativeFinite = z.number().finite().nonnegative();

const noulAnswerSchema = z
  .object({ type: z.literal("noul"), noul: finiteUnit })
  .strict();
const choiceAnswerSchema = z
  .object({
    type: z.literal("choice"),
    choice: z.string().min(1),
    confidence: finiteUnit,
    probabilities: z.record(finiteUnit),
  })
  .strict();
const scoreAnswerSchema = z
  .object({
    type: z.literal("score"),
    score: nonnegativeFinite,
    confidence: finiteUnit,
    legend: z.record(z.string()),
    probabilities: z.record(finiteUnit),
  })
  .strict();

const usageSchema = z
  .object({
    input_tokens: nonnegativeInteger.optional(),
    output_tokens: nonnegativeInteger.optional(),
    total_tokens: nonnegativeInteger.optional(),
    cost: nonnegativeFinite.optional(),
  })
  .strict();

export const openRouterDecisionsResponseSchema = z
  .object({
    answers: z.record(
      z.discriminatedUnion("type", [
        noulAnswerSchema,
        choiceAnswerSchema,
        scoreAnswerSchema,
      ]),
    ),
    model: z.string().trim().min(1),
    provider: z.string().trim().min(1).optional(),
    id: z.string().trim().min(1).optional(),
    usage: usageSchema.optional(),
  })
  .strict();

export type OpenRouterNoulAnswer = z.infer<typeof noulAnswerSchema>;
export type OpenRouterChoiceAnswer = z.infer<typeof choiceAnswerSchema>;
export type OpenRouterScoreAnswer = z.infer<typeof scoreAnswerSchema>;
export type OpenRouterRawAnswer = z.infer<
  typeof openRouterDecisionsResponseSchema
>["answers"][string];

export type CorrelatedOpenRouterAnswer =
  | { type: "noul"; probabilityTrue: number }
  | {
      type: "choice";
      choice: string;
      confidence: number;
      probabilities: Record<string, number>;
    }
  | {
      type: "score";
      score: number;
      confidence: number;
      legend: Record<string, string>;
      probabilities: Record<string, number>;
    };

export interface OpenRouterUsageMetadata {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  cost: number | null;
}

export interface ValidatedOpenRouterResponse {
  answers: Record<string, CorrelatedOpenRouterAnswer>;
  model: string;
  provider: string | null;
  id: string | null;
  usage: OpenRouterUsageMetadata;
}

function invalidResponse(message: string, attempts: number): never {
  throw new OpenRouterDecisionsError("invalid_response", message, { attempts });
}

function sameKeys(actual: string[], expected: string[]): boolean {
  return (
    actual.length === expected.length &&
    actual.every((key) => expected.includes(key))
  );
}

function assertDistribution(
  probabilities: Record<string, number>,
  expectedKeys: string[],
  questionName: string,
  attempts: number,
): void {
  const keys = Object.keys(probabilities);
  if (!sameKeys(keys, expectedKeys)) {
    invalidResponse(
      `OpenRouter answer '${questionName}' has an incomplete or unrelated probability distribution`,
      attempts,
    );
  }
  const total = Object.values(probabilities).reduce((sum, value) => sum + value, 0);
  if (Math.abs(total - 1) > 1e-6) {
    invalidResponse(
      `OpenRouter answer '${questionName}' probability distribution is not normalized`,
      attempts,
    );
  }
}

function correlateAnswer(
  name: string,
  question: OpenRouterQuestion,
  answer: OpenRouterRawAnswer,
  attempts: number,
): CorrelatedOpenRouterAnswer {
  if (answer.type !== question.type) {
    invalidResponse(`OpenRouter answer '${name}' has a mismatched type`, attempts);
  }

  if (question.type === "noul" && answer.type === "noul") {
    return { type: "noul", probabilityTrue: answer.noul };
  }

  if (question.type === "choice" && answer.type === "choice") {
    const criteria = question;
    const expectedKeys = Object.keys(criteria.criteria);
    if (!expectedKeys.includes(answer.choice)) {
      invalidResponse(`OpenRouter answer '${name}' selected an unknown choice`, attempts);
    }
    assertDistribution(answer.probabilities, expectedKeys, name, attempts);
    return {
      type: "choice",
      choice: answer.choice,
      confidence: answer.confidence,
      probabilities: answer.probabilities,
    };
  }

  if (question.type === "score" && answer.type === "score") {
    const criteria = question;
    const maxScore = criteria.criteria.length - 1;
    if (answer.score > maxScore) {
      invalidResponse(`OpenRouter answer '${name}' score is outside the rubric`, attempts);
    }
    const expectedIndexes = criteria.criteria.map((_, index) => String(index));
    if (!sameKeys(Object.keys(answer.legend), expectedIndexes)) {
      invalidResponse(`OpenRouter answer '${name}' has an invalid score legend`, attempts);
    }
    for (const [index, criterion] of criteria.criteria.entries()) {
      if (answer.legend[String(index)] !== criterion) {
        invalidResponse(`OpenRouter answer '${name}' score legend does not match its rubric`, attempts);
      }
    }
    assertDistribution(answer.probabilities, expectedIndexes, name, attempts);
    return {
      type: "score",
      score: answer.score,
      confidence: answer.confidence,
      legend: answer.legend,
      probabilities: answer.probabilities,
    };
  }

  return invalidResponse(`OpenRouter answer '${name}' is invalid`, attempts);
}

/** Validate gateway JSON and correlate every answer with its named request. */
export function validateOpenRouterDecisionsResponse(
  value: unknown,
  request: OpenRouterDecisionsRequest,
  attempts = 0,
): ValidatedOpenRouterResponse {
  const parsed = openRouterDecisionsResponseSchema.safeParse(value);
  if (!parsed.success) {
    throw new OpenRouterDecisionsError(
      "invalid_response",
      "OpenRouter returned an invalid Decisions response",
      { attempts, cause: parsed.error },
    );
  }

  const expectedNames = Object.keys(request.questions);
  const answerNames = Object.keys(parsed.data.answers);
  if (!sameKeys(answerNames, expectedNames)) {
    invalidResponse(
      "OpenRouter response answer names do not match the requested questions",
      attempts,
    );
  }

  const answers: Record<string, CorrelatedOpenRouterAnswer> = {};
  for (const name of expectedNames) {
    const question = request.questions[name];
    const answer = parsed.data.answers[name];
    if (!question || !answer) {
      invalidResponse(`OpenRouter response is missing answer '${name}'`, attempts);
    }
    answers[name] = correlateAnswer(name, question, answer, attempts);
  }

  return {
    answers,
    model: parsed.data.model,
    provider: parsed.data.provider ?? null,
    id: parsed.data.id ?? null,
    usage: {
      inputTokens: parsed.data.usage?.input_tokens ?? null,
      outputTokens: parsed.data.usage?.output_tokens ?? null,
      totalTokens: parsed.data.usage?.total_tokens ?? null,
      cost: parsed.data.usage?.cost ?? null,
    },
  };
}
