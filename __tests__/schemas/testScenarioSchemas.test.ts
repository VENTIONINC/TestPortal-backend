// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import {
  appendTestScenarioStepSchema,
  createTestScenarioSchema,
  reorderTestScenarioStepsSchema,
  testScenarioListQuerySchema,
  updateTestScenarioSchema,
  updateTestScenarioStepSchema,
} from "@/schemas/testScenarioSchemas";

const projectId = "11111111-1111-1111-1111-111111111111";
const stepId = "22222222-2222-2222-2222-222222222222";

describe("structured Test Scenario schemas", () => {
  it("trims structured creation fields and defaults steps", () => {
    expect(
      createTestScenarioSchema.parse({
        projectId,
        title: "  Login  ",
        objective: "  Verify login  ",
        steps: [{ action: "  Open page  ", expectedResult: "  Visible  " }],
      }),
    ).toEqual({
      projectId,
      title: "Login",
      objective: "Verify login",
      steps: [{ action: "Open page", expectedResult: "Visible" }],
    });
    expect(
      createTestScenarioSchema.parse({ projectId, title: "Login" }).steps,
    ).toEqual([]);
  });

  it.each([
    { projectId, title: "Login", contentMd: "# forbidden" },
    { projectId, title: "Login", details: null },
    { projectId, title: "Login", steps: [{ action: "" }] },
    { projectId, title: "Login", steps: [{ action: "Run", id: stepId }] },
    { projectId, title: "" },
  ])("rejects obsolete or invalid creation input %j", (input) => {
    expect(createTestScenarioSchema.safeParse(input).success).toBe(false);
  });

  it("requires a nonempty strict partial update and permits null clearing", () => {
    expect(
      updateTestScenarioSchema.parse({ notes: null, title: " New " }),
    ).toEqual({
      notes: null,
      title: "New",
    });
    expect(updateTestScenarioSchema.safeParse({}).success).toBe(false);
    expect(
      updateTestScenarioSchema.safeParse({ contentMd: "# no" }).success,
    ).toBe(false);
    expect(updateTestScenarioSchema.safeParse({ steps: [] }).success).toBe(
      false,
    );
    expect(updateTestScenarioSchema.safeParse({ title: null }).success).toBe(
      false,
    );
  });

  it("validates step append, patch, and complete ordering inputs", () => {
    expect(appendTestScenarioStepSchema.parse({ action: "Run" })).toEqual({
      action: "Run",
    });
    expect(
      updateTestScenarioStepSchema.parse({ expectedResult: null }),
    ).toEqual({ expectedResult: null });
    expect(reorderTestScenarioStepsSchema.parse({ stepIds: [stepId] })).toEqual(
      { stepIds: [stepId] },
    );
    expect(updateTestScenarioStepSchema.safeParse({}).success).toBe(false);
    expect(
      appendTestScenarioStepSchema.safeParse({ action: "Run", position: 0 })
        .success,
    ).toBe(false);
    expect(
      reorderTestScenarioStepsSchema.safeParse({ stepIds: ["bad"] }).success,
    ).toBe(false);
  });

  it("defaults list options and rejects invalid list filters", () => {
    expect(testScenarioListQuerySchema.parse({ projectId })).toEqual({
      projectId,
      page: 1,
      limit: 30,
      sort: "recently_created",
    });
    expect(
      testScenarioListQuerySchema.parse({
        projectId,
        search: "  login  ",
        createdById: stepId,
        sort: "title_asc",
      }),
    ).toMatchObject({
      search: "login",
      createdById: stepId,
      sort: "title_asc",
    });
    expect(
      testScenarioListQuerySchema.safeParse({ projectId, search: 42 }).success,
    ).toBe(false);
    expect(
      testScenarioListQuerySchema.safeParse({ projectId, createdById: "bad" })
        .success,
    ).toBe(false);
    expect(
      testScenarioListQuerySchema.safeParse({ projectId, sort: "bad" }).success,
    ).toBe(false);
  });
});
