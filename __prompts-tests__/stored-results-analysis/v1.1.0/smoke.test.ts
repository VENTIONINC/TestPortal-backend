// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

/**
 * Smoke tests for stored results analysis prompt
 * Quick validation with minimal test cases (1 per template)
 *
 * Usage: npm run test:prompts:smoke
 */

import "../../testEnv"; // Load environment variables
import fs from "node:fs";
import path from "node:path";
import { runEval } from "../runners/stored-results-analysis";
import { DEFAULT_VERSION } from "../runners/versions";
import type { TestCase } from "./templates/types";

const datasetPath = path.join(
  process.cwd(),
  "__prompts-tests__/stored-results-analysis/datasets/stored-results-analysis/smoke.json",
);

describe("Prompt Evaluation - Smoke Tests (v1.1.0)", () => {
  jest.setTimeout(120_000); // 2 minutes timeout

  it("should satisfy contract and expectations", async () => {
    // Load smoke dataset
    const cases = JSON.parse(
      fs.readFileSync(datasetPath, "utf8"),
    ) as TestCase[];

    // Run evaluation
    const { failures } = await runEval({
      cases,
      version: DEFAULT_VERSION,
    });

    // Log failures for debugging
    if (failures.length > 0) {
      console.error("\n❌ Validation Failures:");
      console.error(JSON.stringify(failures, null, 2));
    }

    // Assert no failures
    expect(failures).toEqual([]);
  });
});
