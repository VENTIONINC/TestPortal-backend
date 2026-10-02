// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { LLMResult } from "@langchain/core/outputs";
import {
  createUsageCollector,
  sumTokenUsage,
} from "../../__prompts-tests__/helpers/evaluation";

describe("prompt evaluation usage", () => {
  it("sums calls without double counting cached input or reasoning tokens", () => {
    expect(
      sumTokenUsage([
        {
          input_tokens: 100,
          output_tokens: 40,
          total_tokens: 140,
          input_token_details: { cache_read: 60 },
          output_token_details: { reasoning: 30 },
        },
        { input_tokens: 20, output_tokens: 10, total_tokens: 30 },
      ]),
    ).toEqual({
      inputTokens: 120,
      outputTokens: 50,
      totalTokens: 170,
      cachedInputTokens: 60,
      reasoningTokens: 30,
    });
  });

  it.each([
    [],
    [null],
    [undefined],
    [{ input_tokens: 1, output_tokens: 2, total_tokens: 3 }, null],
  ])("does not report incomplete usage as zero: %j", (...entries) => {
    expect(sumTokenUsage(entries)).toBeNull();
  });

  it("records missing callback usage so the suite can reject incomplete reports", () => {
    const { usageEntries, callbacks } = createUsageCollector();
    const result: LLMResult = { generations: [[{ text: "response" }]] };
    callbacks[0]?.handleLLMEnd(result);
    expect(usageEntries).toEqual([null]);
  });
});
