// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import {
  deleteTestScenarioSchema,
  getTestScenarioSchema,
  listTestScenariosSchema,
  updateTestScenarioSchema,
} from "@/mcp/schemas/testScenarioSchemas";

const projectId = "11111111-1111-1111-1111-111111111111";
const scenarioId = "22222222-2222-2222-2222-222222222222";

describe("structured Test Scenario MCP schemas", () => {
  it("keeps list and evidence pagination defaults independent", () => {
    expect(listTestScenariosSchema.parse({ projectId })).toEqual({
      projectId,
      page: 1,
      limit: 30,
      sort: "recently_created",
    });
    expect(getTestScenarioSchema.parse({ scenarioId, projectId })).toEqual({
      scenarioId,
      projectId,
      resultPage: 1,
      resultLimit: 30,
      issuePage: 1,
      issueLimit: 30,
    });
  });

  it("accepts structured update fields and nullable clearing", () => {
    expect(
      updateTestScenarioSchema.parse({ scenarioId, projectId, notes: null }),
    ).toMatchObject({ notes: null });
    expect(
      updateTestScenarioSchema.parse({
        scenarioId,
        projectId,
        objective: "Objective",
      }),
    ).toMatchObject({ objective: "Objective" });
    expect(
      updateTestScenarioSchema.safeParse({ scenarioId, projectId }).success,
    ).toBe(false);
    expect(
      updateTestScenarioSchema.safeParse({
        scenarioId,
        projectId,
        contentMd: "# forbidden",
      }).success,
    ).toBe(false);
    expect(
      updateTestScenarioSchema.safeParse({ scenarioId, projectId, steps: [] })
        .success,
    ).toBe(false);
  });

  it("rejects invalid identifiers, pagination, and obsolete creator inputs", () => {
    expect(
      listTestScenariosSchema.safeParse({ projectId: "bad" }).success,
    ).toBe(false);
    expect(
      getTestScenarioSchema.safeParse({
        scenarioId,
        projectId,
        resultLimit: 101,
      }).success,
    ).toBe(false);
    expect(
      deleteTestScenarioSchema.safeParse({
        scenarioId,
        projectId,
        createdById: scenarioId,
      }).success,
    ).toBe(false);
    expect(
      listTestScenariosSchema.safeParse({ projectId, search: 42 }).success,
    ).toBe(false);
    expect(
      listTestScenariosSchema.safeParse({ projectId, createdById: "bad" })
        .success,
    ).toBe(false);
    expect(
      listTestScenariosSchema.safeParse({ projectId, sort: "bad" }).success,
    ).toBe(false);
  });
});
