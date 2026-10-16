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

  it("accepts title/key search options and the documented sort values", () => {
    expect(
      listTestScenariosSchema.parse({
        projectId,
        search: "PAY-42",
        createdById: scenarioId,
        sort: "recently_updated",
      }),
    ).toMatchObject({
      projectId,
      search: "PAY-42",
      createdById: scenarioId,
      sort: "recently_updated",
    });
  });

  it("accepts column sorting and filters and rejects ambiguous sorting", () => {
    expect(listTestScenariosSchema.parse({ projectId, search: "login", sortField: "createdBy", sortDirection: "asc", scenarioKey: "K-1", title: "Login", details: "smoke", folder: "Root / Auth", createdBy: "  Alice " })).toMatchObject({ projectId, search: "login", sortField: "createdBy", sortDirection: "asc", scenarioKey: "K-1", title: "Login", details: "smoke", folder: "Root / Auth", createdBy: "Alice" });
    expect(listTestScenariosSchema.safeParse({ projectId, sortDirection: "asc" }).success).toBe(false);
    expect(listTestScenariosSchema.safeParse({ projectId, sortField: "title", sort: "title_asc" }).success).toBe(false);
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
    expect(updateTestScenarioSchema.parse({ scenarioId, projectId, scenarioKey: " R2 " }).scenarioKey).toBe("R2");
    expect(updateTestScenarioSchema.safeParse({ scenarioId, projectId, scenarioKey: "R1\nR2" }).success).toBe(false);
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
