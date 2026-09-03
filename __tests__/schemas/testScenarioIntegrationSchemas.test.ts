// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import {
  testScenarioEvidenceQuerySchema,
  testScenarioSpecLinkBodySchema,
  testScenarioSpecLinkListQuerySchema,
} from "@/schemas/testScenarioIntegrationSchemas";

const projectId = "11111111-1111-1111-1111-111111111111";
const specId = "22222222-2222-2222-2222-222222222222";

describe("test scenario integration schemas", () => {
  it("accepts link input and defaults paginated queries", () => {
    expect(testScenarioSpecLinkBodySchema.parse({ specId })).toEqual({ specId });
    expect(testScenarioSpecLinkListQuerySchema.parse({ projectId })).toEqual({
      projectId,
      page: 1,
      limit: 30,
    });
    expect(testScenarioEvidenceQuerySchema.parse({ projectId })).toEqual({
      projectId,
      page: 1,
      limit: 30,
    });
  });

  it("coerces valid pagination and rejects invalid or oversized values", () => {
    expect(
      testScenarioEvidenceQuerySchema.parse({
        projectId,
        page: "2",
        limit: "100",
      }),
    ).toEqual({ projectId, page: 2, limit: 100 });
    expect(() =>
      testScenarioEvidenceQuerySchema.parse({ projectId, page: "0" }),
    ).toThrow();
    expect(() =>
      testScenarioEvidenceQuerySchema.parse({ projectId, limit: "101" }),
    ).toThrow();
    expect(() =>
      testScenarioSpecLinkBodySchema.parse({ specId: "not-a-uuid" }),
    ).toThrow();
  });
});
