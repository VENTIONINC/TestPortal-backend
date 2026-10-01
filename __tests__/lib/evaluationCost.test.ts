// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { estimateEvaluationCost } from "../../__prompts-tests__/stored-results-analysis/runners/evaluation-report";

describe("evaluation cost estimate", () => {
  it("prices uncached input, cached input, and reasoning-inclusive output usage", () => {
    const estimate = estimateEvaluationCost("gpt-5.6-luna", {
      inputTokens: 1_000_000,
      cachedInputTokens: 250_000,
      outputTokens: 100_000,
      reasoningTokens: 20_000,
      totalTokens: 1_100_000,
    });

    expect(estimate?.usd).toBeCloseTo(0.275, 10);
    expect(estimate?.ratesPerMillion).toEqual({
      input: 0.2,
      cachedInput: 0.02,
      cacheWrite: 0.25,
      output: 1.2,
    });
  });

  it("uses the cache-write rate when creation tokens are reported", () => {
    const estimate = estimateEvaluationCost("gpt-5.6-luna", {
      inputTokens: 1_000_000,
      cachedInputTokens: 250_000,
      cacheWriteTokens: 100_000,
      outputTokens: 100_000,
      totalTokens: 1_100_000,
    });

    expect(estimate?.usd).toBeCloseTo(0.28, 10);
  });

  it("does not invent a price for missing, invalid, or other-model usage", () => {
    expect(estimateEvaluationCost("gpt-5.6-luna", null)).toBeNull();
    expect(
      estimateEvaluationCost("gpt-5.6-luna", {
        inputTokens: 10,
        cachedInputTokens: 11,
        outputTokens: 2,
        totalTokens: 12,
      }),
    ).toBeNull();
    expect(
      estimateEvaluationCost("gpt-4.1-mini", {
        inputTokens: 10,
        outputTokens: 2,
        totalTokens: 12,
      }),
    ).toBeNull();
  });
});
