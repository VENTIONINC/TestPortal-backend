/**
 * Version registry for prompt testing
 * Maps version IDs to prompt functions and validation schemas
 */

import { getStoredResultsAnalysisPrompt as v1_0_0_prompt } from "@/prompts/stored-results-analysis/v1.0.0";
import { getStoredResultsAnalysisPrompt as v1_1_0_prompt } from "@/prompts/stored-results-analysis/v1.1.0";
import {
  testAnalysisSchemaV1_0_0,
  testAnalysisSchemaV1_1_0,
} from "@/schemas/testAnalysisSchemas";
import type { PromptVersion } from "./stored-results-analysis";

/**
 * Central registry of all supported prompt versions
 */
export const PROMPT_VERSIONS: Record<string, PromptVersion> = {
  "v1.0.0": {
    version: "v1.0.0",
    getPrompt: v1_0_0_prompt,
    schema: testAnalysisSchemaV1_0_0,
  },
  "v1.1.0": {
    version: "v1.1.0",
    getPrompt: v1_1_0_prompt,
    schema: testAnalysisSchemaV1_1_0,
  },
};

/**
 * Default version for backward compatibility
 * Points to current production version (v1.1.0)
 */
export const DEFAULT_VERSION: PromptVersion = {
  version: "v1.1.0",
  getPrompt: v1_1_0_prompt,
  schema: testAnalysisSchemaV1_1_0,
};
