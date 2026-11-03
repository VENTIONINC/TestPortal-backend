// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import * as rest from "@/schemas/testScenarioSchemas";
import * as mcp from "@/mcp/schemas/testScenarioSchemas";

const projectId = "00000000-0000-4000-8000-000000000001";
const scenarioId = "00000000-0000-4000-8000-000000000002";

describe.each([rest, mcp])("server-owned scenario identity", (schemas) => {
  it("defaults creation to medium", () => {
    expect(
      schemas.createTestScenarioSchema.parse({ projectId, title: "Title" }),
    ).toMatchObject({ priority: "medium" });
  });
  it.each([null, "TMS-5"])(
    "rejects scenarioKey %s on create and update",
    (scenarioKey) => {
      expect(
        schemas.createTestScenarioSchema.safeParse({
          projectId,
          title: "Title",
          scenarioKey,
        }).success,
      ).toBe(false);
      expect(
        schemas.updateTestScenarioSchema.safeParse({
          projectId,
          scenarioId,
          title: "Title",
          scenarioKey,
        }).success,
      ).toBe(false);
    },
  );
  it("rejects null priority", () => {
    expect(
      schemas.createTestScenarioSchema.safeParse({
        projectId,
        title: "Title",
        priority: null,
      }).success,
    ).toBe(false);
    expect(
      schemas.updateTestScenarioSchema.safeParse({
        priority: null,
        projectId,
        scenarioId,
      }).success,
    ).toBe(false);
  });
});
