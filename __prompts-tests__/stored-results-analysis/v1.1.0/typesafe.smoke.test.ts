// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";
import path from "node:path";

import { describeWithTypeSafeCredentials } from "../typesafeTestEnv";
import { runTypeSafeSuite } from "../runners/typesafe-suite";
import type { TestCase } from "./templates/types";

const datasetPath = path.join(
  process.cwd(),
  "__prompts-tests__/stored-results-analysis/datasets/stored-results-analysis/smoke.json",
);

describeWithTypeSafeCredentials("TypeSafe category evaluation - smoke (v1.1.0)", () => {
  jest.setTimeout(120_000);

  it("classifies every smoke case correctly", async () => {
    const cases = JSON.parse(fs.readFileSync(datasetPath, "utf8")) as TestCase[];
    expect(cases.length).toBeGreaterThan(0);

    const { reportPaths } = await runTypeSafeSuite({ suite: "smoke", cases });
    console.info(`TypeSafe smoke report: ${reportPaths.timestampedReportPath}`);
    console.info(`TypeSafe smoke latest report: ${reportPaths.latestReportPath}`);
  });
});
