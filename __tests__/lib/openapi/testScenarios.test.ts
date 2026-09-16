// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { generateOpenAPISpec } from "@/lib/openapi";

describe("structured Test Scenario OpenAPI contract", () => {
  it("publishes CRUD and all four authenticated step operations", () => {
    const spec = generateOpenAPISpec();
    const paths = spec.paths ?? {};
    const expected = [
      ["/api/v2/test-scenarios", "post"],
      ["/api/v2/test-scenarios", "get"],
      ["/api/v2/test-scenarios/{scenarioId}", "get"],
      ["/api/v2/test-scenarios/{scenarioId}", "patch"],
      ["/api/v2/test-scenarios/{scenarioId}", "delete"],
      ["/api/v2/test-scenarios/{scenarioId}/steps", "post"],
      ["/api/v2/test-scenarios/{scenarioId}/steps/{stepId}", "patch"],
      ["/api/v2/test-scenarios/{scenarioId}/steps/{stepId}", "delete"],
      ["/api/v2/test-scenarios/{scenarioId}/steps/order", "put"],
    ] as const;

    for (const [path, method] of expected) {
      const operation = paths[path]?.[method];
      expect(operation).toBeDefined();
      expect(operation?.tags).toContain("Test Scenarios");
      expect(operation?.security).toEqual([{ BearerAuth: [] }]);
      expect(operation?.responses?.["400"]).toBeDefined();
      expect(operation?.responses?.["401"]).toBeDefined();
    }
  });

  it("distinguishes writable structured fields from generated detail metadata", () => {
    const schemas = generateOpenAPISpec().components?.schemas ?? {};
    const scenario = schemas.TestScenario as { required?: string[]; properties?: Record<string, unknown> };
    const create = schemas.CreateTestScenarioRequest as { properties?: Record<string, unknown>; additionalProperties?: boolean };
    const update = schemas.UpdateTestScenarioRequest as { properties?: Record<string, unknown>; additionalProperties?: boolean };
    const summary = schemas.TestScenarioSummary as { properties?: Record<string, unknown> };

    expect(scenario.required).toEqual(expect.arrayContaining([
      "contentMd",
      "contentMdHash",
      "contentMdFormatVersion",
      "steps",
      "createdById",
    ]));
    expect(scenario.properties?.contentMdHash).toBeDefined();
    expect(create.properties?.contentMd).toBeUndefined();
    expect(create.properties?.createdById).toBeUndefined();
    expect(create.properties?.steps).toBeDefined();
    expect(create.additionalProperties).toBe(false);
    expect(update.properties?.contentMd).toBeUndefined();
    expect(update.properties?.steps).toBeUndefined();
    expect(update.additionalProperties).toBe(false);
    expect(summary.properties?.contentMd).toBeUndefined();
    expect(summary.properties?.steps).toBeUndefined();
  });

  it("preserves integration evidence operations and deletion envelopes", () => {
    const paths = generateOpenAPISpec().paths ?? {};
    for (const operation of [
      paths["/api/v2/test-scenarios/{scenarioId}/spec-links"]?.post,
      paths["/api/v2/test-scenarios/{scenarioId}/spec-links"]?.get,
      paths["/api/v2/test-scenarios/{scenarioId}/spec-links/{specId}"]?.delete,
      paths["/api/v2/test-scenarios/{scenarioId}/results"]?.get,
      paths["/api/v2/test-scenarios/{scenarioId}/issues"]?.get,
    ]) {
      expect(operation).toBeDefined();
      expect(operation?.tags).toContain("Test Scenarios");
      expect(operation?.responses?.["404"]).toBeDefined();
    }
    expect(paths["/api/v2/test-scenarios/{scenarioId}"]?.delete?.responses?.["204"]).toBeDefined();
  });
});
