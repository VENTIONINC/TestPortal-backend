// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

export const DEFAULT_OPENROUTER_CONCURRENCY = 8;
export const DEFAULT_OPENROUTER_TIMEOUT_MS = 30_000;
export const DEFAULT_OPENROUTER_RETRIES = 0;

export const OPENROUTER_EVALUATION_PROFILES = {
  jev: {
    id: "jev",
    model: "typesafe/jev-1.13",
  },
  openai: {
    id: "openai",
    model: "openai/gpt-6-luna-decisions",
  },
  microsoft: {
    id: "microsoft",
    model: "microsoft/microsoft-decision-1",
  },
} as const;

export type OpenRouterProfileId = keyof typeof OPENROUTER_EVALUATION_PROFILES;

export interface OpenRouterEvaluationProfile {
  id: OpenRouterProfileId;
  model: string;
  concurrency: number;
  timeoutMs: number;
  maxRetries: 0;
}

export interface OpenRouterProfileOverrides {
  concurrency?: number;
  timeoutMs?: number;
}

function positiveInteger(name: string, value: number | undefined, fallback: number, max?: number): number {
  const result = value ?? fallback;
  if (!Number.isInteger(result) || result < 1 || (max !== undefined && result > max)) {
    const range = max === undefined ? "a positive integer" : `an integer between 1 and ${max}`;
    throw new Error(`${name} must be ${range}`);
  }
  return result;
}

/** Resolve one explicitly selected provider profile and safe execution limits. */
export function resolveOpenRouterProfile(
  profileId: string,
  overrides: OpenRouterProfileOverrides = {},
): OpenRouterEvaluationProfile {
  const unsupportedOverrides = Object.keys(overrides).filter(
    (key) => key !== "concurrency" && key !== "timeoutMs",
  );
  if (unsupportedOverrides.length > 0) {
    throw new Error(
      `Unsupported OpenRouter evaluation override(s): ${unsupportedOverrides.join(", ")}`,
    );
  }
  if (!Object.hasOwn(OPENROUTER_EVALUATION_PROFILES, profileId)) {
    throw new Error(
      `Unknown OpenRouter evaluation profile '${profileId}'; expected 'jev', 'openai', or 'microsoft'`,
    );
  }
  const selected =
    OPENROUTER_EVALUATION_PROFILES[profileId as OpenRouterProfileId];

  return {
    ...selected,
    concurrency: positiveInteger(
      "concurrency",
      overrides.concurrency,
      DEFAULT_OPENROUTER_CONCURRENCY,
      32,
    ),
    timeoutMs: positiveInteger(
      "timeoutMs",
      overrides.timeoutMs,
      DEFAULT_OPENROUTER_TIMEOUT_MS,
      120_000,
    ),
    maxRetries: DEFAULT_OPENROUTER_RETRIES,
  };
}
