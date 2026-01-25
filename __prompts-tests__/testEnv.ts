/**
 * Test environment setup for prompt tests
 * Loads environment variables from .env file
 */

import dotenv from "dotenv";

// Load .env file
dotenv.config();

// Ensure required environment variables are set
if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    "OPENAI_API_KEY environment variable is required for prompt tests. " +
      "Please add it to your .env file.",
  );
}

// Configure LangSmith tracing for prompt tests using dedicated variables
if (
  process.env.PROMPT_TEST_LANGSMITH_API_KEY &&
  process.env.PROMPT_TEST_LANGSMITH_TRACING === "true"
) {
  process.env.LANGSMITH_TRACING = process.env.PROMPT_TEST_LANGSMITH_TRACING;
  process.env.LANGSMITH_API_KEY = process.env.PROMPT_TEST_LANGSMITH_API_KEY;
  process.env.LANGSMITH_PROJECT = process.env.PROMPT_TEST_LANGSMITH_PROJECT;
}
