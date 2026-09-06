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

describe("Test Scenario MCP schemas", () => {
  it("accepts a list request and applies the service defaults", () => {
    const result = listTestScenariosSchema.safeParse({ projectId });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ projectId, page: 1, limit: 30 });
    }
  });

  it("requires UUID project and scenario identifiers", () => {
    expect(
      listTestScenariosSchema.safeParse({ projectId: "not-a-uuid" }).success,
    ).toBe(false);
    expect(
      getTestScenarioSchema.safeParse({ scenarioId, projectId: "invalid" })
        .success,
    ).toBe(false);
    expect(
      deleteTestScenarioSchema.safeParse({ scenarioId: "invalid", projectId })
        .success,
    ).toBe(false);
  });

  it.each([
    ["page", 0],
    ["page", 1.5],
    ["limit", 0],
    ["limit", 101],
    ["limit", 1.5],
  ])("rejects invalid list %s values: %s", (field, value) => {
    expect(
      listTestScenariosSchema.safeParse({ projectId, [field]: value }).success,
    ).toBe(false);
  });

  it("constrains Result and Issue pagination independently", () => {
    const result = getTestScenarioSchema.safeParse({
      scenarioId,
      projectId,
      resultPage: 2,
      resultLimit: 5,
      issuePage: 3,
      issueLimit: 7,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        resultPage: 2,
        resultLimit: 5,
        issuePage: 3,
        issueLimit: 7,
      });
    }

    for (const field of [
      "resultPage",
      "resultLimit",
      "issuePage",
      "issueLimit",
    ]) {
      expect(
        getTestScenarioSchema.safeParse({
          scenarioId,
          projectId,
          [field]: field.endsWith("Page") ? 0 : 101,
        }).success,
      ).toBe(false);
    }
  });

  it("accepts only scenario fields for partial updates", () => {
    expect(
      updateTestScenarioSchema.safeParse({
        scenarioId,
        projectId,
        title: "Updated title",
      }).success,
    ).toBe(true);
    expect(
      updateTestScenarioSchema.safeParse({
        scenarioId,
        projectId,
        contentMd: "# Exact Markdown\n",
      }).success,
    ).toBe(true);
    expect(
      updateTestScenarioSchema.safeParse({
        scenarioId,
        projectId,
        details: "  Human-readable details  ",
      }).success,
    ).toBe(true);
    expect(
      updateTestScenarioSchema.safeParse({
        scenarioId,
        projectId,
        details: null,
      }).success,
    ).toBe(true);
    expect(
      updateTestScenarioSchema.safeParse({
        scenarioId,
        projectId,
        title: "Updated title",
        contentMd: "# Exact Markdown\n",
      }).success,
    ).toBe(true);

    expect(
      updateTestScenarioSchema.safeParse({
        scenarioId,
        projectId,
        createdById: "33333333-3333-3333-3333-333333333333",
      }).success,
    ).toBe(false);
    expect(
      updateTestScenarioSchema.safeParse({
        scenarioId,
        projectId,
        details: "   ",
      }).success,
    ).toBe(false);
    expect(
      updateTestScenarioSchema.safeParse({
        scenarioId,
        projectId,
        details: 123,
      }).success,
    ).toBe(false);
  });

  it("does not expose scenario creation or creator identity inputs", () => {
    expect(
      updateTestScenarioSchema.safeParse({ scenarioId, projectId }).success,
    ).toBe(true);
    expect(
      listTestScenariosSchema.safeParse({ projectId, createdById: scenarioId })
        .success,
    ).toBe(false);
    expect(
      deleteTestScenarioSchema.safeParse({
        scenarioId,
        projectId,
        createdById: scenarioId,
      }).success,
    ).toBe(false);
  });
});
