// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { z } from "zod";
import {
  errorSuggestionSchema,
  type ErrorSuggestionOutput,
} from "@/schemas/errorSuggestionSchemas";
import {
  systemPrompt as errorSolutionSystemPrompt,
  userPrompt as errorSolutionUserPrompt,
} from "@/prompts/error-solution/v1.0.0";

export interface PromptVersion {
  version: string;
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType<ErrorSuggestionOutput>;
}

export const PROMPT_VERSIONS: Record<string, PromptVersion> = {
  "v1.0.0": {
    version: "v1.0.0",
    systemPrompt: errorSolutionSystemPrompt,
    userPrompt: errorSolutionUserPrompt,
    schema: errorSuggestionSchema,
  },
};

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const DEFAULT_VERSION: PromptVersion = PROMPT_VERSIONS["v1.0.0"]!;
