// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import dotenv from "dotenv";

import type { OpenRouterProfileId } from "./runners/openrouter-profiles";

dotenv.config();

export interface OpenRouterTestEnvironment {
  OPENROUTER_API_KEY?: string | undefined;
}

export interface OpenRouterTestConfig {
  enabled: boolean;
  profile: OpenRouterProfileId;
}

/** Resolve opt-in state before any live-suite callback reads a dataset. */
export function resolveOpenRouterTestConfig(
  environment: OpenRouterTestEnvironment,
): OpenRouterTestConfig {
  return {
    enabled: Boolean(environment.OPENROUTER_API_KEY?.trim()),
    profile: "openai",
  };
}

const openRouterTestConfig = resolveOpenRouterTestConfig({
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
});

/** Skip live suites before their callbacks can read datasets or call OpenRouter. */
export const describeWithOpenRouterCredentials = openRouterTestConfig.enabled
  ? describe
  : describe.skip;

export const openRouterTestProfile = openRouterTestConfig.profile;
