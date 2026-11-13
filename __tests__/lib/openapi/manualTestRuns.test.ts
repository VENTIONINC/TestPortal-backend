// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { generateOpenAPISpec } from "@/lib/openapi";

describe("manual test run OpenAPI contract", () => {
  it("publishes the complete authenticated multi-scenario contract", () => {
    const paths = generateOpenAPISpec().paths ?? {};
    const expected = [
      ["/api/v2/manual-test-runs", "post"],
      ["/api/v2/manual-test-runs", "get"],
      ["/api/v2/manual-test-runs/{runId}", "get"],
      ["/api/v2/manual-test-runs/{runId}", "delete"],
      ["/api/v2/manual-test-runs/{runId}/scenarios/order", "put"],
      ["/api/v2/manual-test-runs/{runId}/scenarios/bulk", "post"],
      ["/api/v2/manual-test-runs/{runId}/scenarios/{scenarioId}/result", "put"],
      [
        "/api/v2/manual-test-runs/{runId}/scenarios/{scenarioId}/assignee",
        "patch",
      ],
      ["/api/v2/manual-test-runs/{runId}/complete", "post"],
      ["/api/v2/manual-test-runs/{runId}/reopen", "post"],
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

    expect(
      paths["/api/v2/test-scenarios/{scenarioId}/manual-runs"],
    ).toBeUndefined();
    expect(
      paths["/api/v2/manual-test-runs/{runId}/steps/{stepId}"],
    ).toBeUndefined();
    expect(paths["/api/v2/manual-test-runs/{runId}/executor"]).toBeUndefined();
  });

  it("documents aggregate snapshots, execution state, and current filters", () => {
    const spec = generateOpenAPISpec();
    const schemas = spec.components?.schemas ?? {};
    const run = schemas.ManualTestRun as {
      properties?: Record<string, unknown>;
    };
    const scenario = schemas.ManualTestRunScenario as {
      properties?: Record<string, unknown>;
    };
    const step = schemas.ManualTestRunScenarioStep as {
      properties?: Record<string, unknown>;
    };
    const status = schemas.ManualTestRunStatus as { enum?: string[] };
    const result = schemas.ManualTestRunScenarioResult as { enum?: string[] };
    const history = schemas.ManualTestRunHistoryQuery as {
      properties?: Record<string, unknown>;
    };
    const paths = spec.paths ?? {};
    const create = paths["/api/v2/manual-test-runs"]?.post;

    expect(run.properties?.scenarios).toBeDefined();
    expect(run.properties?.completedById).toBeDefined();
    expect(scenario.properties?.resultById).toBeDefined();
    expect(scenario.properties?.assigneeId).toBeDefined();
    expect(scenario.properties?.steps).toBeDefined();
    expect(scenario.properties?.contentMd).toBeUndefined();
    expect(step.properties?.status).toBeUndefined();
    expect(status.enum).toEqual(["in_progress", "completed"]);
    expect(result.enum).toEqual([
      "untested",
      "passed",
      "failed",
      "blocked",
      "skipped",
    ]);
    expect(history.properties?.show).toBeDefined();
    expect(history.properties?.period).toBeDefined();
    expect(history.properties?.timeZone).toBeDefined();
    expect(create?.requestBody).toBeDefined();
    const createSchema = schemas.ManualTestRunCreateRequest as {
      anyOf: Array<{ properties: Record<string, unknown> }>;
    };
    for (const source of createSchema.anyOf) {
      expect(source.properties.browser).toBeDefined();
      expect(source.properties.build).toBeDefined();
    }
  });

  it("keeps environment profile endpoints and nullable run snapshots", () => {
    const spec = generateOpenAPISpec();
    const base = "/api/v2/projects/{projectId}/manual-run-environment-profiles";
    expect(spec.paths?.[base]?.get).toBeDefined();
    expect(spec.paths?.[base]?.post).toBeDefined();
    expect(spec.paths?.[`${base}/{profileId}`]?.patch).toBeDefined();
    expect(spec.paths?.[`${base}/{profileId}`]?.delete).toBeDefined();
    const schemas = spec.components?.schemas as Record<
      string,
      { properties?: Record<string, { type?: string | string[] }> }
    >;
    for (const field of [
      "browser",
      "operatingSystem",
      "device",
      "apiEnvironment",
      "build",
      "deployment",
    ]) {
      expect(schemas.ManualTestRun?.properties?.[field]?.type).toEqual([
        "string",
        "null",
      ]);
      expect(schemas.ManualTestRunSummary?.properties?.[field]?.type).toEqual([
        "string",
        "null",
      ]);
    }
    expect(
      schemas.ManualRunEnvironmentProfile?.properties?.browser?.type,
    ).toEqual(["string", "null"]);
  });
});
