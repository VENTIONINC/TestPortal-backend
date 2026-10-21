// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";
import path from "node:path";

import {
  describeWithOpenRouterCredentials,
  openRouterTestProfile,
} from "../openrouterTestEnv";
import { runOpenRouterSuite } from "../runners/openrouter-suite";
import type { TestCase } from "./templates/types";

const datasetPath = path.join(
  process.cwd(),
  "__prompts-tests__/stored-results-analysis/datasets/stored-results-analysis/regression.json",
);

describeWithOpenRouterCredentials(
  `OpenRouter category evaluation - regression (${openRouterTestProfile}, v1.1.0)`,
  () => {
    jest.setTimeout(300_000);

    it("meets the 90% category accuracy threshold", async () => {
      const cases = JSON.parse(fs.readFileSync(datasetPath, "utf8")) as TestCase[];
      expect(cases.length).toBeGreaterThan(0);

      const { result, reportPaths } = await runOpenRouterSuite({
        suite: "regression",
        cases,
        profile: openRouterTestProfile,
      });
      if (result.accuracy === null) {
        throw new Error("Regression suite completed without an accuracy value");
      }
      console.info(
        `OpenRouter regression accuracy: ${(result.accuracy * 100).toFixed(1)}%`,
      );
      console.info(`OpenRouter regression report: ${reportPaths.timestampedReportPath}`);
      console.info(`OpenRouter regression latest report: ${reportPaths.latestReportPath}`);
    });
  },
);
