// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

export interface PromptModelSettings {
  model: string;
  useResponsesApi: boolean;
  reasoningEffort?: "none" | "low" | "medium" | "high";
  temperature?: number;
  maxTokens?: number;
  maxRetries: number;
}

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
