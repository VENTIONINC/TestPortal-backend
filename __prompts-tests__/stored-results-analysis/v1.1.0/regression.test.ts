// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

/**
 * Regression tests for stored results analysis prompt
 * Comprehensive validation with multiple variations per template
 *
 * Usage: npm run test:prompts:regression
 */

import "../../testEnv"; // Load environment variables
import fs from "node:fs";
import path from "node:path";
import { runEval } from "../runners/stored-results-analysis";
import { DEFAULT_VERSION } from "../runners/versions";
import type { TestCase } from "./templates/types";

const datasetPath = path.join(
  process.cwd(),
  "__prompts-tests__/stored-results-analysis/datasets/stored-results-analysis/regression.json",
);

describe("Prompt Evaluation - Regression Tests (v1.1.0)", () => {
  jest.setTimeout(300_000); // 5 minutes timeout

  it("should satisfy contract and expectations", async () => {
    // Load regression dataset
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
