// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { generateOpenAPISpec } from "@/lib/openapi";

describe("result-error modal OpenAPI contract", () => {
  it("documents nullable modal context and authenticated response statuses", () => {
    const spec = generateOpenAPISpec();
    const schemas = spec.components?.schemas ?? {};
    const operation =
      spec.paths?.["/api/v2/result-errors/{resultErrorId}/modal-context"]?.get;

    expect(schemas).toHaveProperty("ResultErrorModalContext");
    expect(JSON.stringify(schemas.ResultErrorModalContext)).toContain(
      '"sourceSnippet"',
    );
    expect(JSON.stringify(schemas.ResultErrorModalContext)).toContain(
      '"generatedTestCase"',
    );
    expect(schemas.ResultErrorModalContext).toMatchObject({
      properties: {
        error: {
          properties: {
            sourceSnippet: {
              anyOf: expect.arrayContaining([
                expect.objectContaining({ type: "object" }),
                expect.objectContaining({ type: "null" }),
              ]),
            },
          },
        },
        result: {
          properties: {
            category: { enum: expect.arrayContaining(["bug", "infra"]) },
          },
        },
        assignments: {
          properties: {
            confirmed: {
              anyOf: expect.arrayContaining([
                expect.objectContaining({ type: "object" }),
                expect.objectContaining({ type: "null" }),
              ]),
            },
          },
        },
      },
    });
    expect(operation?.security).toEqual([{ BearerAuth: [] }]);
    expect(operation?.responses).toEqual(
      expect.objectContaining({
        "200": expect.any(Object),
        "400": expect.any(Object),
        "404": expect.any(Object),
        "500": expect.any(Object),
      }),
    );
  });

  it("does not document the removed similarity contract", () => {
    const spec = generateOpenAPISpec();
    const schemas = spec.components?.schemas ?? {};
    const operation =
      spec.paths?.[
        "/api/v2/result-errors/{resultErrorId}/similarity-suggestion"
      ]?.get;
    expect(schemas).not.toHaveProperty("ResultErrorSimilarityOutcome");
    expect(operation).toBeUndefined();
  });
});
