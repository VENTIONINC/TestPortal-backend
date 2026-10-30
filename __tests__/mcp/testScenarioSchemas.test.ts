// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import {
  deleteTestScenarioSchema,
  appendTestScenarioStepSchema,
  updateTestScenarioStepSchema,
  deleteTestScenarioStepSchema,
  reorderTestScenarioStepsSchema,
  getTestScenarioSchema,
  listTestScenariosSchema,
  updateTestScenarioSchema,
} from "@/mcp/schemas/testScenarioSchemas";

const projectId = "11111111-1111-1111-1111-111111111111";
const scenarioId = "22222222-2222-2222-2222-222222222222";
const stepId = "44444444-4444-4444-4444-444444444444";

describe("structured Test Scenario MCP schemas", () => {
  it("validates organization filters strictly", () => {
    for (const folderId of [scenarioId, "unfiled"]) {
      expect(listTestScenariosSchema.parse({ projectId, folderId, suiteId: stepId, includeDescendants: false })).toMatchObject({ folderId, suiteId: stepId, includeDescendants: false });
    }
    for (const input of [{ folderId: "bad" }, { suiteId: "bad" }, { includeDescendants: "false" }, { unknown: true }]) {
      expect(listTestScenariosSchema.safeParse({ projectId, ...input }).success).toBe(false);
    }
  });
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
    expect(
      listTestScenariosSchema.parse({
        projectId,
        search: "login",
        sortField: "createdBy",
        sortDirection: "asc",
        scenarioKey: "K-1",
        title: "Login",
        details: "smoke",
        folder: "Root / Auth",
        createdBy: "  Alice ",
      }),
    ).toMatchObject({
      projectId,
      search: "login",
      sortField: "createdBy",
      sortDirection: "asc",
      scenarioKey: "K-1",
      title: "Login",
      details: "smoke",
      folder: "Root / Auth",
      createdBy: "Alice",
    });
    expect(
      listTestScenariosSchema.safeParse({ projectId, sortDirection: "asc" })
        .success,
    ).toBe(false);
    expect(
      listTestScenariosSchema.safeParse({
        projectId,
        sortField: "title",
        sort: "title_asc",
      }).success,
    ).toBe(false);
  });

  it("accepts structured update fields and nullable clearing", () => {
    expect(
      updateTestScenarioSchema.parse({
        scenarioId,
        projectId,
        relatedIssueUrl: null,
      }),
    ).toMatchObject({ relatedIssueUrl: null });
    expect(
      updateTestScenarioSchema.parse({
        scenarioId,
        projectId,
        priority: "high",
      }),
    ).toMatchObject({ priority: "high" });
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
    expect(
      updateTestScenarioSchema.parse({
        scenarioId,
        projectId,
        scenarioKey: " R2 ",
      }).scenarioKey,
    ).toBe("R2");
    expect(
      updateTestScenarioSchema.safeParse({
        scenarioId,
        projectId,
        scenarioKey: "R1\nR2",
      }).success,
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

  it("validates and trims append step inputs strictly", () => {
    expect(
      appendTestScenarioStepSchema.parse({
        projectId,
        scenarioId,
        action: "  Click save  ",
        expectedResult: "  Saved  ",
      }),
    ).toEqual({
      projectId,
      scenarioId,
      action: "Click save",
      expectedResult: "Saved",
    });
    expect(
      appendTestScenarioStepSchema.parse({ projectId, scenarioId, action: " Go " }),
    ).toEqual({ projectId, scenarioId, action: "Go" });
    for (const invalid of [
      { projectId: "bad", scenarioId, action: "Go" },
      { projectId, scenarioId, action: "   " },
      { projectId, scenarioId, action: "Go", expectedResult: " " },
      { projectId, scenarioId, action: "Go", expectedResult: null },
      { projectId, scenarioId, action: "Go", stepId },
      { projectId, scenarioId, action: "Go", position: 0 },
    ]) {
      expect(appendTestScenarioStepSchema.safeParse(invalid).success).toBe(false);
    }
  });

  it("requires a meaningful strict step update and distinguishes omission from clearing", () => {
    expect(
      updateTestScenarioStepSchema.parse({
        projectId,
        scenarioId,
        stepId,
        action: "  Submit  ",
      }),
    ).toEqual({ projectId, scenarioId, stepId, action: "Submit" });
    expect(
      updateTestScenarioStepSchema.parse({
        projectId,
        scenarioId,
        stepId,
        expectedResult: null,
      }),
    ).toEqual({ projectId, scenarioId, stepId, expectedResult: null });
    for (const invalid of [
      { projectId, scenarioId, stepId },
      { projectId, scenarioId, stepId, action: " " },
      { projectId, scenarioId, stepId, action: null },
      { projectId, scenarioId, stepId, expectedResult: " " },
      { projectId, scenarioId, stepId, unsupported: true },
      { projectId, scenarioId, stepId: "bad", action: "Go" },
    ]) {
      expect(updateTestScenarioStepSchema.safeParse(invalid).success).toBe(false);
    }
  });

  it("validates delete identifiers and reorder UUID array shape", () => {
    expect(deleteTestScenarioStepSchema.parse({ projectId, scenarioId, stepId })).toEqual({
      projectId,
      scenarioId,
      stepId,
    });
    expect(
      reorderTestScenarioStepsSchema.parse({ projectId, scenarioId, stepIds: [] }),
    ).toEqual({ projectId, scenarioId, stepIds: [] });
    expect(
      reorderTestScenarioStepsSchema.safeParse({
        projectId,
        scenarioId,
        stepIds: [stepId, "bad"],
      }).success,
    ).toBe(false);
    expect(
      reorderTestScenarioStepsSchema.safeParse({ projectId, scenarioId, stepIds: stepId })
        .success,
    ).toBe(false);
    expect(
      reorderTestScenarioStepsSchema.safeParse({ projectId, scenarioId, stepIds: [], extra: true })
        .success,
    ).toBe(false);
  });
});
