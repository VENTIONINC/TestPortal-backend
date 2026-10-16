// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import dotenv from "dotenv";

import type { OpenRouterProfileId } from "./runners/openrouter-profiles";

dotenv.config();

export interface OpenRouterTestEnvironment {
  OPENROUTER_API_KEY?: string | undefined;
  OPENROUTER_EVAL_PROFILE?: string | undefined;
}

export interface OpenRouterTestConfig {
  enabled: boolean;
  profile?: OpenRouterProfileId;
}

/** Resolve opt-in state before any live-suite callback reads a dataset. */
export function resolveOpenRouterTestConfig(
  environment: OpenRouterTestEnvironment,
): OpenRouterTestConfig {
  const configuredProfile = environment.OPENROUTER_EVAL_PROFILE;
  const profile = configuredProfile === undefined ? "openai" : configuredProfile;
  if (profile !== "jev" && profile !== "openai") {
    throw new Error(
      `Invalid OPENROUTER_EVAL_PROFILE '${profile}'; expected 'jev' or 'openai'`,
    );
  }

  return {
    enabled: Boolean(environment.OPENROUTER_API_KEY?.trim()),
    profile,
  };
}

const openRouterTestConfig = resolveOpenRouterTestConfig({
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_EVAL_PROFILE: process.env.OPENROUTER_EVAL_PROFILE,
});

/** Skip live suites before their callbacks can read datasets or call OpenRouter. */
export const describeWithOpenRouterCredentials = openRouterTestConfig.enabled
  ? describe
  : describe.skip;

export const openRouterTestProfile = openRouterTestConfig.profile ?? "openai";
