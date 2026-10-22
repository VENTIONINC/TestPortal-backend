// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

/**
 * Test environment setup for prompt tests
 * Loads environment variables from .env file
 */

import dotenv from "dotenv";

// Load .env file
dotenv.config();

// Live suites skip when credentials are absent; direct runners validate separately.
export const hasOpenAiCredentials = Boolean(process.env.OPENAI_API_KEY?.trim());

// Configure LangSmith tracing for prompt tests using dedicated variables
if (
  process.env.PROMPT_TEST_LANGSMITH_API_KEY &&
  process.env.PROMPT_TEST_LANGSMITH_TRACING === "true"
) {
  process.env.LANGSMITH_TRACING = process.env.PROMPT_TEST_LANGSMITH_TRACING;
  process.env.LANGSMITH_API_KEY = process.env.PROMPT_TEST_LANGSMITH_API_KEY;
  process.env.LANGSMITH_PROJECT = process.env.PROMPT_TEST_LANGSMITH_PROJECT;
}
