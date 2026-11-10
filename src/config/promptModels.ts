// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

export interface PromptModelSettings {
  model: string;
  useResponsesApi: boolean;
  reasoningEffort?: "none" | "low" | "medium" | "high";
  temperature?: number;
  maxTokens: number;
  maxRetries: number;
}

export const storedResultsAnalysisConfig: PromptModelSettings = {
  model: "gpt-6-luna",
  useResponsesApi: true,
  reasoningEffort: "low",
  maxTokens: 4000,
  maxRetries: 2,
};

export const errorFormatterConfig: PromptModelSettings = {
  model: "gpt-6-luna",
  useResponsesApi: true,
  reasoningEffort: "none",
  maxTokens: 500,
  maxRetries: 2,
};

export function getPromptModelOptions(settings: PromptModelSettings) {
  const { reasoningEffort, temperature, ...options } = settings;
  return {
    ...options,
    ...(reasoningEffort !== undefined
      ? settings.useResponsesApi
        ? // LangChain 1.4.5 does not recognize GPT-6 reasoning models.
          { modelKwargs: { reasoning: { effort: reasoningEffort } } }
        : { reasoning: { effort: reasoningEffort } }
      : temperature !== undefined
        ? { temperature }
        : {}),
  };
}
