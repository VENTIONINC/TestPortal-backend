// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { generateOpenAPISpec } from "@/lib/openapi";

describe("manual test run OpenAPI contract", () => {
  it("publishes all seven authenticated operations", () => {
    const paths = generateOpenAPISpec().paths ?? {};
    const expected = [
      ["/api/v2/test-scenarios/{scenarioId}/manual-runs", "post"],
      ["/api/v2/test-scenarios/{scenarioId}/manual-runs", "get"],
      ["/api/v2/manual-test-runs", "get"],
      ["/api/v2/manual-test-runs/{runId}", "get"],
      ["/api/v2/manual-test-runs/{runId}", "patch"],
      ["/api/v2/manual-test-runs/{runId}/steps/{stepId}", "patch"],
      ["/api/v2/manual-test-runs/{runId}/complete", "post"],
    ] as const;

    for (const [path, method] of expected) {
      const operation = paths[path]?.[method];
      expect(operation).toBeDefined();
      expect(operation?.tags).toContain("Manual Test Runs");
      expect(operation?.security).toEqual([{ BearerAuth: [] }]);
      expect(operation?.responses?.["400"]).toBeDefined();
      expect(operation?.responses?.["401"]).toBeDefined();
      expect(operation?.responses?.["404"]).toBeDefined();
      expect(operation?.responses?.["409"]).toBeDefined();
    }
  });

  it("documents detached relations, lightweight summaries, and status enums", () => {
    const schemas = generateOpenAPISpec().components?.schemas ?? {};
    const run = schemas.ManualTestRun as {
      properties?: Record<
        string,
        { type?: string | string[]; readOnly?: boolean; $ref?: string }
      >;
    };
    const summary = schemas.ManualTestRunSummary as {
      properties?: Record<string, unknown>;
    };
    const status = schemas.ManualTestRunStatus as {
      enum?: string[];
    };
    const executor = schemas.ManualTestRunExecutor as { type?: string | string[] };

    expect(run.properties?.testScenarioId?.type).toEqual(["string", "null"]);
    expect(executor.type).toEqual(["object", "null"]);
    expect(run.properties?.sourceTestScenarioId?.readOnly).toBe(true);
    expect(summary.properties?.steps).toBeUndefined();
    expect(summary.properties?.notes).toBeUndefined();
    expect(status.enum).toEqual([
      "in_progress",
      "passed",
      "failed",
      "blocked",
      "skipped",
    ]);
  });
});
