// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import dotenv from "dotenv";

dotenv.config();

if (!process.env.TYPESAFE_API_KEY) {
  throw new Error(
    "TYPESAFE_API_KEY environment variable is required for TypeSafe prompt tests. Please add it to your .env file.",
  );
}

if (
  process.env.PROMPT_TEST_LANGSMITH_API_KEY &&
  process.env.PROMPT_TEST_LANGSMITH_TRACING === "true"
) {
  process.env.LANGSMITH_TRACING = process.env.PROMPT_TEST_LANGSMITH_TRACING;
  process.env.LANGSMITH_API_KEY = process.env.PROMPT_TEST_LANGSMITH_API_KEY;
  process.env.LANGSMITH_PROJECT = process.env.PROMPT_TEST_LANGSMITH_PROJECT;
}
