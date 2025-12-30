/**
 * Smoke tests for stored results analysis prompt
 * Quick validation with minimal test cases (1 per template)
 *
 * Usage: npm run test:prompts:smoke
 */

import "./testEnv"; // Load environment variables
import fs from "node:fs";
import path from "node:path";
import { runEval } from "./runners/stored-results-analysis";
import type { TestCase } from "./templates/types";

const datasetPath = path.join(
  process.cwd(),
  "prompt-tests/datasets/stored-results-analysis/smoke.json",
);

describe("Prompt Evaluation - Smoke Tests (v1.1.0)", () => {
  jest.setTimeout(120_000); // 2 minutes timeout

  it("should satisfy contract and expectations", async () => {
    // Load smoke dataset (4 test cases)
    const cases = JSON.parse(
      fs.readFileSync(datasetPath, "utf8"),
    ) as TestCase[];

    // Run evaluation
    const { failures } = await runEval({ cases });

    // Log failures for debugging
    if (failures.length > 0) {
      console.error("\n❌ Validation Failures:");
      console.error(JSON.stringify(failures, null, 2));
    }

    // Assert no failures
    expect(failures).toEqual([]);
  });
});
