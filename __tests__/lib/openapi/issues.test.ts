// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { generateOpenAPISpec } from "@/lib/openapi";

describe("issue OpenAPI contract", () => {
  it("documents reusable core, read, summary, statistics, and pagination schemas", () => {
    const spec = generateOpenAPISpec();
    const schemas = spec.components?.schemas ?? {};

    expect(schemas).toHaveProperty("IssueCore");
    expect(schemas).toHaveProperty("ResultCategory", {
      type: "string",
      enum: ["bug", "infra", "performance", "script", "other"],
    });
    expect(schemas).toHaveProperty("IssueCategorySummary");
    expect(schemas).toHaveProperty("IssueRead");
    expect(schemas).toHaveProperty("IssueStatistics");
    expect(schemas).toHaveProperty("PaginatedIssueList");

    expect(schemas.IssueRead).toMatchObject({
      allOf: [
        { $ref: "#/components/schemas/IssueCore" },
        {
          properties: {
            categorySummary: { $ref: "#/components/schemas/IssueCategorySummary" },
          },
        },
      ],
    });
    expect(schemas.IssueCategorySummary).toMatchObject({
      properties: {
        displayCategory: { $ref: "#/components/schemas/ResultCategory" },
      },
    });
  });

  it("requires lowercase category writes and documents persisted filtering", () => {
    const spec = generateOpenAPISpec();
    const schemas = spec.components?.schemas ?? {};
    const createSchema = JSON.stringify(schemas.CreateIssueRequest);
    const updateSchema = JSON.stringify(schemas.UpdateIssueRequest);
    const listOperation = spec.paths?.["/api/v2/issues"]?.get;
    const listOperationJson = JSON.stringify(listOperation);
    const detailResponseJson = JSON.stringify(
      spec.paths?.["/api/v2/issues/{issueId}"]?.get?.responses?.["200"],
    );

    expect(createSchema).toContain('"category"');
    expect(schemas.CreateIssueRequest).toMatchObject({
      required: expect.arrayContaining(["category"]),
    });
    expect(updateSchema).toContain('"category"');
    expect(listOperationJson).toContain('"category"');
    expect(listOperationJson).toContain("PaginatedIssueList");
    expect(detailResponseJson).toContain("IssueRead");
  });

  it("documents mixed summaries while retaining persisted top-issue categories", () => {
    const specJson = JSON.stringify(generateOpenAPISpec());

    expect(specJson).toContain(
      "Human category correction. When present, this is authoritative over analysisCategory.",
    );
    expect(specJson).toContain("categorySummary");
    expect(specJson).toContain('"topIssues"');
    expect(specJson).toContain('"category"');
  });
});
