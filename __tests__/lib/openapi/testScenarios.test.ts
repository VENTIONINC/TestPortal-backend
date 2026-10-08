// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { generateOpenAPISpec } from "@/lib/openapi";

describe("structured Test Scenario OpenAPI contract", () => {
  it("publishes folder, suite, membership, and bulk organization operations", () => {
    const paths = generateOpenAPISpec().paths ?? {};
    for (const [path, method] of [
      ["/api/v2/test-scenario-folders", "get"], ["/api/v2/test-scenario-folders", "post"],
      ["/api/v2/test-scenario-folders/{folderId}", "patch"], ["/api/v2/test-scenario-folders/{folderId}", "delete"],
      ["/api/v2/test-suites", "get"], ["/api/v2/test-suites", "post"],
      ["/api/v2/test-suites/{suiteId}", "get"], ["/api/v2/test-suites/{suiteId}", "patch"], ["/api/v2/test-suites/{suiteId}", "delete"],
      ["/api/v2/test-suites/{suiteId}/members", "post"], ["/api/v2/test-suites/{suiteId}/members", "delete"],
      ["/api/v2/test-suites/{suiteId}/members/order", "put"], ["/api/v2/test-scenarios/bulk-folder", "patch"],
    ] as const) {
      const operation = paths[path]?.[method];
      expect(operation).toBeDefined();
      expect(operation?.tags).toContain("Test Scenarios");
      expect(operation?.security).toEqual([{ BearerAuth: [] }]);
      expect(operation?.responses?.[method === "post" && (path === "/api/v2/test-scenario-folders" || path === "/api/v2/test-suites") ? "201" : "200"]?.content?.["application/json"]?.schema).toBeDefined();
    }
    expect(paths["/api/v2/test-suites/{suiteId}/members"]?.delete?.requestBody).toBeDefined();
    expect(paths["/api/v2/test-scenario-folders/{folderId}"]?.delete?.parameters).toEqual(expect.arrayContaining([expect.objectContaining({ name: "disposition", in: "query" })]));
    const query = generateOpenAPISpec().components?.schemas?.TestScenarioListQuery as { properties?: Record<string, unknown> };
    expect(query.properties?.folderId).toBeDefined();
    expect(query.properties?.includeDescendants).toBeDefined();
    expect(query.properties?.suiteId).toBeDefined();
  });

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
    expect(scenario.properties?.scenarioKey).toBeDefined();
    expect(summary.properties?.scenarioKey).toBeDefined();
    expect(create.properties?.scenarioKey).toBeDefined();
    expect(update.properties?.scenarioKey).toBeDefined();
    expect(summary.properties?.steps).toBeUndefined();
  });

  it("documents title and key search on the REST catalog operation", () => {
    const operation = generateOpenAPISpec().paths?.["/api/v2/test-scenarios"]?.get;
    const description = operation?.description ?? "";
    const querySchema = generateOpenAPISpec().components?.schemas
      ?.TestScenarioListQuery as { properties?: Record<string, { description?: string }> };

    expect(description).toContain("title or scenarioKey");
    expect(querySchema.properties?.search?.description).toContain(
      "title or scenarioKey",
    );
    expect(querySchema.properties?.search?.description).toContain(
      "backslash are literal",
    );
    expect(querySchema.properties).toEqual(expect.objectContaining({
      sortField: expect.any(Object), sortDirection: expect.any(Object),
      scenarioKey: expect.any(Object), title: expect.any(Object), details: expect.any(Object),
      folder: expect.any(Object), createdBy: expect.any(Object),
    }));
    expect(description).toContain("folder-path");
    expect(description).toContain("cannot be combined with sortField");
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
