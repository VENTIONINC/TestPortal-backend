// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { generateOpenAPISpec } from "@/lib/openapi";
import { createSuccessResponse } from "@/mcp/helpers/mcpHelpers";

describe("public result projection", () => {
  it("excludes internal analysis lifecycle fields from REST and MCP public contracts", () => {
    const resultSchema = generateOpenAPISpec().components?.schemas?.Result as {
      properties?: Record<string, unknown>;
    };
    expect(resultSchema.properties).not.toHaveProperty("analysisMetadata");
    expect(resultSchema.properties).not.toHaveProperty("analysisLastError");

    const response = createSuccessResponse({
      result: {
        id: "r-1",
        analysisCategory: "bug",
        analysisFeedbackCategory: "infra",
        analysisMetadata: { secret: "no-leak" },
        nested: [{ analysisLastError: { evidence: "no-leak" }, keep: true }],
      },
    });
    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    expect(text).toContain('"analysisCategory": "bug"');
    expect(text).toContain('"analysisFeedbackCategory": "infra"');
    expect(text).toContain('"keep": true');
    expect(text).not.toContain("analysisMetadata");
    expect(text).not.toContain("analysisLastError");
    expect(text).not.toContain("no-leak");
  });
});
