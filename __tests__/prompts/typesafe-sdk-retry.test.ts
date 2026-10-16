// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { runTypeSafeStoredResultsAnalysis } from "../../__prompts-tests__/stored-results-analysis/runners/typesafe-stored-results-analysis";
import type { TestCase } from "../../__prompts-tests__/stored-results-analysis/v1.1.0/templates/types";

const sampleCase: TestCase = {
  name: "temporary provider failure",
  input: {
    id: "case-1",
    specKey: "api/health.spec.ts",
    specTitle: "health endpoint",
    status: "failed",
    duration: 1200,
    retry: 1,
    executionName: "CI",
    errorMessage: "provider temporarily unavailable",
  },
  expect: {
    category: "infra",
    status: "failed",
    errorQuality: "required",
  },
};

describe("TypeSafe SDK retry policy", () => {
  const originalApiKey = process.env.TYPESAFE_API_KEY;

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalApiKey === undefined) {
      delete process.env.TYPESAFE_API_KEY;
    } else {
      process.env.TYPESAFE_API_KEY = originalApiKey;
    }
  });

  test("makes one HTTP attempt per case so request counts stay accurate", async () => {
    process.env.TYPESAFE_API_KEY = "test-api-key";
    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("temporary provider failure", { status: 503 }),
    );

    await expect(
      runTypeSafeStoredResultsAnalysis({ cases: [sampleCase], concurrency: 1 }),
    ).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
