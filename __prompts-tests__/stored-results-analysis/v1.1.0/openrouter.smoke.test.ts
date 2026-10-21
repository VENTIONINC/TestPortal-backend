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
  "__prompts-tests__/stored-results-analysis/datasets/stored-results-analysis/smoke.json",
);

describeWithOpenRouterCredentials(
  `OpenRouter category evaluation - smoke (${openRouterTestProfile}, v1.1.0)`,
  () => {
    jest.setTimeout(120_000);

    it("classifies every smoke case correctly", async () => {
      const cases = JSON.parse(fs.readFileSync(datasetPath, "utf8")) as TestCase[];
      expect(cases.length).toBeGreaterThan(0);

      const { reportPaths } = await runOpenRouterSuite({
        suite: "smoke",
        cases,
        profile: openRouterTestProfile,
      });
      console.info(`OpenRouter smoke report: ${reportPaths.timestampedReportPath}`);
      console.info(`OpenRouter smoke latest report: ${reportPaths.latestReportPath}`);
    });
  },
);
