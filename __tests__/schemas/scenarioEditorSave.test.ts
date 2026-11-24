// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import {
  createTestScenarioSchema,
  updateTestScenarioSchema,
} from "@/schemas/testScenarioSchemas";

const projectId = "00000000-0000-4000-8000-000000000001";
const id = "00000000-0000-4000-8000-000000000002";
const collections = { steps: [], suiteIds: [], newSuites: [] };

describe("scenario editor save contract", () => {
  it("accepts zero rows/memberships and revision-protected collections", () => {
    expect(
      createTestScenarioSchema.parse({
        projectId,
        title: "Scenario",
        ...collections,
      }),
    ).toMatchObject(collections);
    expect(
      updateTestScenarioSchema.parse({ ...collections, expectedRevision: 1 }),
    ).toEqual({ ...collections, expectedRevision: 1 });
    expect(updateTestScenarioSchema.parse({ title: "Field-only" })).toEqual({
      title: "Field-only",
    });
  });
  it.each([
    {},
    { steps: [] },
    { suiteIds: [] },
    { newSuites: [] },
    { steps: [], suiteIds: [] },
  ])("rejects incomplete collections %j", (partial) => {
    expect(
      updateTestScenarioSchema.safeParse({ ...partial, expectedRevision: 1 })
        .success,
    ).toBe(false);
  });
  it("accepts retained step identities only in edits", () => {
    const steps = [{ id, action: "Action", expectedResult: null }];
    expect(
      updateTestScenarioSchema.safeParse({
        ...collections,
        steps,
        expectedRevision: 1,
      }).success,
    ).toBe(true);
    expect(
      createTestScenarioSchema.safeParse({
        projectId,
        title: "Scenario",
        steps,
      }).success,
    ).toBe(false);
  });
  it.each([0, -1, 1.5, null, "1"])(
    "rejects invalid revision %s",
    (expectedRevision) => {
      expect(
        updateTestScenarioSchema.safeParse({ ...collections, expectedRevision })
          .success,
      ).toBe(false);
    },
  );
  it("rejects duplicate step/suite IDs and normalized draft suite names", () => {
    for (const invalid of [
      { suiteIds: [id, id] },
      {
        steps: [
          { id, action: "One" },
          { id, action: "Two" },
        ],
      },
      { newSuites: [{ name: " Smoke " }, { name: "smoke" }] },
      { newSuites: [{ name: " " }] },
      { newSuites: [{ name: "x".repeat(201) }] },
      { steps: [{ action: " " }] },
      { steps: [{ action: "Action", position: 0 }] },
    ]) {
      expect(
        updateTestScenarioSchema.safeParse({
          ...collections,
          ...invalid,
          expectedRevision: 1,
        }).success,
      ).toBe(false);
    }
  });
});
