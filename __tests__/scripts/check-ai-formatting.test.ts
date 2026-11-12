// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";

import { runAiFormattingCheck } from "../../scripts/check-ai-formatting";

describe("runAiFormattingCheck", () => {
  it("reports a schema-valid synthetic result without exposing extra fields", async () => {
    const writeSuccess = jest.fn();
    const format = jest.fn(async () => ({
      name: "Synthetic timeout",
      description: "Synthetic details",
      category: "private",
    }));

    const exitCode = await runAiFormattingCheck({
      initialize: async () => undefined,
      format,
      writeSuccess,
      writeFailure: jest.fn(),
    });

    expect(exitCode).toBe(0);
    expect(format).toHaveBeenCalledWith({
      name: "Synthetic checkout timeout",
      description:
        "Synthetic request timed out after 250ms at tests/ai-formatting-check.spec.ts:12:3.",
    });
    expect(writeSuccess).toHaveBeenCalledWith(
      JSON.stringify({
        status: "ok",
        result: {
          name: "Synthetic timeout",
          description: "Synthetic details",
        },
      }),
    );
  });

  it("returns a safe nonzero failure without printing provider details", async () => {
    const writeFailure = jest.fn();
    const writeSuccess = jest.fn();

    const exitCode = await runAiFormattingCheck({
      initialize: async () => undefined,
      format: async () => {
        throw new Error("api key secret and response body");
      },
      writeSuccess,
      writeFailure,
    });

    expect(exitCode).toBe(1);
    expect(writeSuccess).not.toHaveBeenCalled();
    expect(writeFailure).toHaveBeenCalledWith(
      "Synthetic AI formatting check failed. Review the safe backend diagnostic.",
    );
    expect(JSON.stringify(writeFailure.mock.calls)).not.toMatch(
      /api key secret|response body/,
    );
  });
});
