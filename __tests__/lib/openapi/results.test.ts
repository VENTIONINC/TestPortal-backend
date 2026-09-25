// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { generateOpenAPISpec } from "@/lib/openapi";

type OpenApiSchema = {
  $ref?: string;
  additionalProperties?: boolean;
  allOf?: OpenApiSchema[];
  anyOf?: OpenApiSchema[];
  nullable?: boolean;
  properties?: Record<string, OpenApiSchema>;
  required?: string[];
  items?: OpenApiSchema;
  type?: string | string[];
};

type OpenApiResponse = {
  responses?: Record<
    string,
    { content?: Record<string, { schema?: OpenApiSchema }> }
  >;
};

describe("Result OpenAPI contract", () => {
  const spec = generateOpenAPISpec();
  const paths = (spec.paths ?? {}) as Record<
    string,
    Record<string, OpenApiResponse | undefined> | undefined
  >;
  const schemas = (spec.components?.schemas ?? {}) as Record<
    string,
    OpenApiSchema | undefined
  >;

  const requiredSchema = (name: string): OpenApiSchema => {
    const schema = schemas[name];
    expect(schema).toBeDefined();
    if (!schema) {
      throw new Error(`Missing OpenAPI schema ${name}`);
    }
    return schema;
  };

  const successSchema = (path: string, method: string): OpenApiSchema | undefined =>
    paths[path]?.[method]?.responses?.["200"]?.content?.["application/json"]
      ?.schema;

  it("documents related scenarios with generated Markdown on Result detail only", () => {
    expect(
      successSchema("/api/v2/results/{resultId}", "get")?.$ref,
    ).toBe("#/components/schemas/ResultDetail");

    const detail = requiredSchema("ResultDetail");
    const summary = requiredSchema("RelatedTestScenarioSummary");
    const detailExtension = detail.allOf?.find((schema) =>
      schema.properties?.relatedTestScenarios,
    );
    expect(detail.allOf?.[0]?.$ref).toBe("#/components/schemas/Result");
    expect(detailExtension?.required).toContain("relatedTestScenarios");
    expect(
      detailExtension?.properties?.relatedTestScenarios?.items?.$ref,
    ).toBe(
      "#/components/schemas/RelatedTestScenarioSummary",
    );
    expect(summary.required).toEqual(["id", "title", "details", "contentMd"]);
    expect(Object.keys(summary.properties ?? {}).sort()).toEqual([
      "contentMd",
      "details",
      "id",
      "title",
    ]);
    expect(summary.properties?.contentMd?.type).toBe("string");
    expect(summary.properties?.details?.type).toEqual(["string", "null"]);
    expect(summary.additionalProperties).toBe(false);
  });

  it("keeps list, scenario evidence, and analysis contracts on the shared Result schema", () => {
    expect(
      requiredSchema("Result").properties?.relatedTestScenarios,
    ).toBeUndefined();
    expect(
      successSchema("/api/v2/results", "get")?.$ref,
    ).toBe("#/components/schemas/ResultsListResponse");

    const unchangedContracts = [
      successSchema("/api/v2/results", "get"),
      successSchema("/api/v2/test-scenarios/{scenarioId}/results", "get"),
      successSchema("/api/v2/results/{resultId}/analysis", "patch"),
      successSchema(
        "/api/v2/results/{resultId}/analysis-feedback",
        "patch",
      ),
    ];
    expect(JSON.stringify(unchangedContracts)).not.toContain(
      "relatedTestScenarios",
    );
  });
});
