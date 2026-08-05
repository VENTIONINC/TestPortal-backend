// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { generateOpenAPISpec } from "@/lib/openapi";

describe("error formatter OpenAPI contract", () => {
  it("documents optional canonical context and deprecated legacy alias without category response fields", () => {
    const spec = generateOpenAPISpec();
    const schemas = spec.components?.schemas ?? {};
    const requestJson = JSON.stringify(schemas.ErrorFormatterRequest);
    const responseJson = JSON.stringify(schemas.ErrorFormatterResponse);
    const suggestionJson = JSON.stringify(schemas.ErrorSuggestionResponse);

    expect(schemas.ErrorFormatterRequest).toMatchObject({
      type: "object",
      required: ["name", "description"],
      properties: {
        contextCategory: {
          enum: ["bug", "infra", "performance", "script", "other"],
        },
        category: {
          deprecated: true,
        },
      },
    });
    expect(schemas.ErrorFormatterRequest).not.toMatchObject({
      required: expect.arrayContaining(["contextCategory", "category"]),
    });
    expect(requestJson).toContain('"contextCategory"');
    expect(requestJson).toContain('"category"');
    expect(requestJson).toContain('"bug"');
    expect(requestJson).toContain('"infra"');
    expect(requestJson).toContain('"performance"');
    expect(requestJson).toContain('"script"');
    expect(requestJson).toContain('"other"');
    expect(responseJson).not.toContain('"original"');
    expect(responseJson).not.toContain('"category"');
    expect(suggestionJson).not.toContain('"category"');
  });
});
