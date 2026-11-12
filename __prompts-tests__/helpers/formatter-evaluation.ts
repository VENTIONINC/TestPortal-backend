// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { AiOperationConfig } from "@/config/aiConfigSchema";

export type FormatterEvaluationEnvironment = Record<string, string | undefined>;

export function resolveFormatterEvaluationOverrides(
  env: FormatterEvaluationEnvironment,
): Partial<AiOperationConfig> {
  if (
    env.ERROR_FORMATTER_TEMPERATURE !== undefined &&
    env.ERROR_FORMATTER_REASONING !== undefined
  ) {
    throw new Error(
      "Conflicting evaluation settings: ERROR_FORMATTER_TEMPERATURE and ERROR_FORMATTER_REASONING cannot be combined.",
    );
  }
  if (env.ERROR_FORMATTER_MAX_RETRIES !== undefined) {
    throw new Error(
      "ERROR_FORMATTER_MAX_RETRIES is unsupported; retry policy is fixed by the shared operation client.",
    );
  }
  if (env.ERROR_FORMATTER_USE_RESPONSES_API !== undefined) {
    throw new Error(
      "ERROR_FORMATTER_USE_RESPONSES_API is unsupported; use ERROR_FORMATTER_API=responses or ERROR_FORMATTER_API=chat-completions.",
    );
  }

  return {
    ...(env.ERROR_FORMATTER_MODEL
      ? { model: env.ERROR_FORMATTER_MODEL }
      : {}),
    ...(env.ERROR_FORMATTER_API
      ? { api: env.ERROR_FORMATTER_API as AiOperationConfig["api"] }
      : {}),
    ...(env.ERROR_FORMATTER_REASONING
      ? {
          reasoningEffort: env.ERROR_FORMATTER_REASONING as AiOperationConfig["reasoningEffort"],
          temperature: undefined,
        }
      : {}),
    ...(env.ERROR_FORMATTER_TEMPERATURE
      ? {
          temperature: Number(env.ERROR_FORMATTER_TEMPERATURE),
          reasoningEffort: undefined,
        }
      : {}),
    ...(env.ERROR_FORMATTER_MAX_OUTPUT_TOKENS
      ? { maxOutputTokens: Number(env.ERROR_FORMATTER_MAX_OUTPUT_TOKENS) }
      : {}),
  };
}

export function createFormatterEvaluationClient<T>(
  createClient: (overrides: Partial<AiOperationConfig>) => T,
  env: FormatterEvaluationEnvironment,
): { client: T; overrides: Partial<AiOperationConfig> } {
  const overrides = resolveFormatterEvaluationOverrides(env);
  return { client: createClient(overrides), overrides };
}
