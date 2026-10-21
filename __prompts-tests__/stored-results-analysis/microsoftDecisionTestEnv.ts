// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import dotenv from "dotenv";

dotenv.config();

export interface MicrosoftDecisionTestEnvironment {
  OPENROUTER_API_KEY?: string | undefined;
}

export interface MicrosoftDecisionTestConfig {
  enabled: boolean;
}

/** Resolve Microsoft opt-in without consulting other provider settings. */
export function resolveMicrosoftDecisionTestConfig(
  environment: MicrosoftDecisionTestEnvironment,
): MicrosoftDecisionTestConfig {
  return { enabled: Boolean(environment.OPENROUTER_API_KEY?.trim()) };
}

const microsoftDecisionTestConfig = resolveMicrosoftDecisionTestConfig({
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
});

/** Skip before suite callbacks can read datasets or call OpenRouter. */
export const describeWithMicrosoftDecisionCredentials =
  microsoftDecisionTestConfig.enabled ? describe : describe.skip;
