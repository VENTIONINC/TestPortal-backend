// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { generateOpenAPISpec } from "@/lib/openapi";

describe("test-scenario OpenAPI contract", () => {
  it("registers all four authenticated operations under the Test Scenarios tag", () => {
    const spec = generateOpenAPISpec();
    const paths = spec.paths ?? {};
    const list = paths["/api/v2/test-scenarios"]?.get;
    const create = paths["/api/v2/test-scenarios"]?.post;
    const detail = paths["/api/v2/test-scenarios/{scenarioId}"]?.get;
    const remove = paths["/api/v2/test-scenarios/{scenarioId}"]?.delete;

    expect(list).toBeDefined();
    expect(create).toBeDefined();
    expect(detail).toBeDefined();
    expect(remove).toBeDefined();
    expect(spec.tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Test Scenarios" }),
      ]),
    );

    for (const operation of [list, create, detail, remove]) {
      expect(operation?.tags).toContain("Test Scenarios");
      expect(operation?.security).toEqual([{ BearerAuth: [] }]);
      expect(operation?.responses?.["400"]).toBeDefined();
      expect(operation?.responses?.["401"]).toBeDefined();
    }
    expect(detail?.responses?.["404"]).toBeDefined();
    expect(remove?.responses?.["404"]).toBeDefined();
    expect(create?.responses?.["404"]).toBeDefined();
    expect(list?.responses?.["500"]).toBeDefined();
  });

  it("documents the exact resource and pagination envelope", () => {
    const spec = generateOpenAPISpec();
    const schemas = spec.components?.schemas ?? {};

    expect(schemas.TestScenario).toBeDefined();
    expect(schemas.CreateTestScenarioRequest).toBeDefined();
    expect(schemas.TestScenarioListResponse).toBeDefined();
    expect(schemas.TestScenarioListQuery).toBeDefined();

    const scenarioSchema = schemas.TestScenario as {
      required?: string[];
      properties?: Record<string, unknown>;
    };
    const createSchema = schemas.CreateTestScenarioRequest as {
      properties?: Record<string, unknown>;
    };
    expect(scenarioSchema.required).toContain("createdById");
    expect(scenarioSchema.properties?.createdById).toBeDefined();
    expect(createSchema.properties?.createdById).toBeUndefined();

    const listResponse = schemas.TestScenarioListResponse as {
      properties?: Record<string, unknown>;
    };
    expect(Object.keys(listResponse.properties ?? {})).toEqual([
      "scenarios",
      "total",
      "page",
      "limit",
      "totalPages",
    ]);

    const listQuery = schemas.TestScenarioListQuery as {
      properties?: Record<string, { maximum?: number; minimum?: number }>;
    };
    expect(listQuery.properties?.limit?.minimum).toBe(1);
    expect(listQuery.properties?.limit?.maximum).toBe(100);
  });

  it("documents 201 creation and empty 204 deletion", () => {
    const spec = generateOpenAPISpec();

    expect(
      spec.paths?.["/api/v2/test-scenarios"]?.post?.responses?.["201"],
    ).toBeDefined();
    expect(
      spec.paths?.["/api/v2/test-scenarios/{scenarioId}"]?.delete?.responses?.[
        "204"
      ],
    ).toEqual(expect.objectContaining({ description: "Test scenario deleted" }));
  });
});
