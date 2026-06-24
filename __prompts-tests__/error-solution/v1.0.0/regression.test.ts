// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

/**
 * Regression tests for error solution prompt
 */

import "../../testEnv";
import fs from "node:fs";
import path from "node:path";
import { runEval } from "../runners/error-solution";
import { DEFAULT_VERSION } from "../runners/versions";
import type { TestCase } from "./templates/types";

const datasetPath = path.join(
  process.cwd(),
  "__prompts-tests__/error-solution/datasets/error-solution/regression.json",
);

describe("Prompt Evaluation - Regression Tests (error-solution v1.0.0)", () => {
  jest.setTimeout(300_000);

  it("should satisfy contract and expectations", async () => {
    const cases = JSON.parse(
      fs.readFileSync(datasetPath, "utf8"),
    ) as TestCase[];

    const { failures } = await runEval({
      cases,
      version: DEFAULT_VERSION,
    });

    if (failures.length > 0) {
      console.error("\n❌ Validation Failures:");
      console.error(JSON.stringify(failures, null, 2));
    }

    expect(failures).toEqual([]);
  });
});
