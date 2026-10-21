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
  "__prompts-tests__/stored-results-analysis/datasets/stored-results-analysis/smoke.json",
);

describeWithMicrosoftDecisionCredentials(
  "Microsoft Decision category evaluation - smoke (v1.1.0)",
  () => {
    jest.setTimeout(120_000);

    it("classifies every smoke case correctly", async () => {
      const cases = JSON.parse(fs.readFileSync(datasetPath, "utf8")) as TestCase[];
      expect(cases.length).toBeGreaterThan(0);

      const { reportPaths } = await runOpenRouterSuite({
        suite: "smoke",
        cases,
        profile: "microsoft",
      });
      console.info(`Microsoft smoke report: ${reportPaths.timestampedReportPath}`);
      console.info(`Microsoft smoke latest report: ${reportPaths.latestReportPath}`);
    });
  },
);
