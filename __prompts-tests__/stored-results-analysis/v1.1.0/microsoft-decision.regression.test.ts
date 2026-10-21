// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";
import path from "node:path";

import {
  describeWithMicrosoftDecisionCredentials,
} from "../microsoftDecisionTestEnv";
import { runOpenRouterSuite } from "../runners/openrouter-suite";
import type { TestCase } from "./templates/types";

const datasetPath = path.join(
  process.cwd(),
  "__prompts-tests__/stored-results-analysis/datasets/stored-results-analysis/regression.json",
);

describeWithMicrosoftDecisionCredentials(
  "Microsoft Decision category evaluation - regression (v1.1.0)",
  () => {
    jest.setTimeout(300_000);

    it("meets the 90% category accuracy threshold", async () => {
      const cases = JSON.parse(fs.readFileSync(datasetPath, "utf8")) as TestCase[];
      expect(cases.length).toBeGreaterThan(0);

      const { result, reportPaths } = await runOpenRouterSuite({
        suite: "regression",
        cases,
        profile: "microsoft",
      });
      if (result.accuracy === null) {
        throw new Error("Regression suite completed without an accuracy value");
      }
      console.info(
        `Microsoft regression accuracy: ${(result.accuracy * 100).toFixed(1)}%`,
      );
      console.info(`Microsoft regression report: ${reportPaths.timestampedReportPath}`);
      console.info(`Microsoft regression latest report: ${reportPaths.latestReportPath}`);
    });
  },
);
