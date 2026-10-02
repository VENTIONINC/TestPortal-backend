// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

/**
 * Version registry for prompt testing
 * Maps version IDs to prompt functions and validation schemas
 */

import { getStoredResultsAnalysisPrompt as v1_1_0_prompt } from "@/prompts/stored-results-analysis/v1.1.0";
import { getStoredResultsAnalysisPrompt as v1_2_0_prompt } from "@/prompts/stored-results-analysis/v1.2.0";
import {
  testAnalysisSchemaV1_1_0,
  testAnalysisSchemaV1_2_0,
} from "@/schemas/testAnalysisSchemas";
import type { PromptVersion } from "./stored-results-analysis";

/**
 * Central registry of all supported prompt versions
 */
export const PROMPT_VERSIONS = {
  "v1.1.0": {
    version: "v1.1.0",
    getPrompt: v1_1_0_prompt,
    schema: testAnalysisSchemaV1_1_0,
  },
  "v1.2.0": {
    version: "v1.2.0",
    getPrompt: v1_2_0_prompt,
    schema: testAnalysisSchemaV1_2_0,
  },
} satisfies Record<string, PromptVersion>;

/**
 * Default version for backward compatibility
 * Points to current production version (v1.2.0)
 */
export const DEFAULT_VERSION: PromptVersion = PROMPT_VERSIONS["v1.2.0"];
