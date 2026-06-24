// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

/**
 * Prompt evaluation runner for error solution suggestion
 */

import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
} from "@langchain/core/prompts";
import { SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import type { ErrorSuggestionOutput } from "@/schemas/errorSuggestionSchemas";
import type { TestCase } from "../v1.0.0/templates/types";
import type { EvalFailure, EvalResult } from "./types";
import type { PromptVersion } from "./versions";

export interface RunEvalOptions {
  cases: TestCase[];
  version: PromptVersion;
  model?: string;
  temperature?: number;
}

const stepRegex = /(?:^|\n)\s*\d+[).]/g;
const stepsHeadingRegex = /steps to identify|steps to reproduce|steps:/i;

export async function runEval(options: RunEvalOptions): Promise<EvalResult> {
  const { cases, version, model = "gpt-4.1-mini", temperature = 0.3 } = options;

  const llm = new ChatOpenAI({
    model,
    temperature,
    maxTokens: 600,
    maxRetries: 2,
    cache: false,
  });

  const structuredModel = llm.withStructuredOutput<ErrorSuggestionOutput>(
    version.schema,
    {
      name: "error_solution_suggestion",
    },
  );

  const prompt = ChatPromptTemplate.fromMessages([
    new SystemMessage(version.systemPrompt),
    HumanMessagePromptTemplate.fromTemplate(version.userPrompt),
  ]);

  const failures: EvalFailure[] = [];
  const responses: EvalResult["responses"] = [];

  for (const tc of cases) {
    const response = await structuredModel.invoke(
      await prompt.formatMessages(tc.input),
    );

    responses.push({ testCaseName: tc.name, output: response });

    const description = response.description?.trim() ?? "";
    if (description.length < tc.expect.minLength) {
      failures.push({
        testCaseName: tc.name,
        reason: `Description too short: expected >=${tc.expect.minLength}, got ${description.length}`,
      });
    }

    const steps = description.match(stepRegex) ?? [];
    if (steps.length < tc.expect.minSteps) {
      failures.push({
        testCaseName: tc.name,
        reason: `Not enough numbered steps: expected >=${tc.expect.minSteps}, got ${steps.length}`,
      });
    }

    if (tc.expect.requireStepsHeading && !stepsHeadingRegex.test(description)) {
      failures.push({
        testCaseName: tc.name,
        reason: "Missing steps heading",
      });
    }
  }

  return { responses, failures };
}
