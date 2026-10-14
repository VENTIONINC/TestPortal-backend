// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";
import path from "node:path";

import { describeWithTypeSafeCredentials } from "../typesafeTestEnv";
import { runTypeSafeSuite } from "../runners/typesafe-suite";
import type { TestCase } from "./templates/types";

const datasetPath = path.join(
  process.cwd(),
  "__prompts-tests__/stored-results-analysis/datasets/stored-results-analysis/regression.json",
);

describeWithTypeSafeCredentials("TypeSafe category evaluation - regression (v1.1.0)", () => {
  jest.setTimeout(300_000);

  it("meets the 90% category accuracy threshold", async () => {
    const cases = JSON.parse(fs.readFileSync(datasetPath, "utf8")) as TestCase[];
    expect(cases.length).toBeGreaterThan(0);

    const { result, reportPaths } = await runTypeSafeSuite({
      suite: "regression",
      cases,
    });
    console.info(`TypeSafe regression accuracy: ${(result.accuracy * 100).toFixed(1)}%`);
    console.info(`TypeSafe regression report: ${reportPaths.timestampedReportPath}`);
    console.info(`TypeSafe regression latest report: ${reportPaths.latestReportPath}`);
  });
});
