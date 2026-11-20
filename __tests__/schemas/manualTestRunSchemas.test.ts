// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import {
  manualTestRunCompleteSchema,
  manualTestRunCreateSchema,
  manualTestRunDetailsSchema,
  manualTestRunHistoryQuerySchema,
  manualTestRunReopenSchema,
  manualTestRunScenarioBulkSchema,
  manualTestRunScenarioEvidenceSchema,
} from "@/schemas/manualTestRunSchemas";

const projectId = "11111111-1111-4111-8111-111111111111";
const scenarioId = "22222222-2222-4222-8222-222222222222";

describe("manual test run request schemas", () => {
  it("accepts exactly one source form and preserves selected scenario order", () => {
    const second = "33333333-3333-4333-8333-333333333333";
    const suite = "44444444-4444-4444-8444-444444444444";
    expect(
      manualTestRunCreateSchema.parse({ scenarioIds: [scenarioId, second], title: "Regression run" }),
    ).toEqual({ scenarioIds: [scenarioId, second], title: "Regression run" });
    expect(manualTestRunCreateSchema.parse({ suiteId: suite, title: "Suite run" })).toEqual({
      suiteId: suite,
      title: "Suite run",
    });
    expect(manualTestRunCreateSchema.safeParse({}).success).toBe(false);
    expect(
      manualTestRunCreateSchema.safeParse({
        scenarioIds: [scenarioId],
        title: "Run",
        suiteId: suite,
      }).success,
    ).toBe(false);
    expect(
      manualTestRunCreateSchema.safeParse({
        scenarioIds: [scenarioId, scenarioId],
      }).success,
    ).toBe(false);
  });

  it("accepts validated environment metadata for either source", () => {
    expect(
      manualTestRunCreateSchema.parse({
        scenarioIds: [scenarioId],
        title: "Metadata run",
        browser: " Chrome ",
        build: " 42 ",
        device: null,
      }),
    ).toEqual({
      scenarioIds: [scenarioId],
      title: "Metadata run",
      browser: "Chrome",
      build: "42",
      device: null,
    });
    expect(
      manualTestRunCreateSchema.parse({
        suiteId: scenarioId,
        title: "Suite metadata run",
        deployment: "stage",
      }),
    ).toEqual({ suiteId: scenarioId, title: "Suite metadata run", deployment: "stage" });
    expect(
      manualTestRunCreateSchema.safeParse({
        suiteId: scenarioId,
        title: "Bad browser",
        browser: "x".repeat(201),
      }).success,
    ).toBe(false);
    expect(
      manualTestRunCreateSchema.safeParse({
        suiteId: scenarioId,
        title: "Bad build",
        build: "a\nb",
      }).success,
    ).toBe(false);
  });

  it("requires an empty lifecycle request and rejects client-owned fields", () => {
    expect(manualTestRunCompleteSchema.parse({})).toEqual({});
    expect(manualTestRunReopenSchema.parse({})).toEqual({});
    expect(
      manualTestRunCompleteSchema.safeParse({ status: "completed" }).success,
    ).toBe(false);
    expect(
      manualTestRunReopenSchema.safeParse({ completedById: projectId }).success,
    ).toBe(false);
  });

  it("validates run list period and local date filters", () => {
    expect(
      manualTestRunHistoryQuerySchema.parse({
        projectId,
        page: "2",
        period: "recent",
      }),
    ).toMatchObject({
      projectId,
      page: 2,
      limit: 30,
      show: "in_progress",
      timeZone: "UTC",
    });
    expect(
      manualTestRunHistoryQuerySchema.safeParse({
        projectId,
        period: "custom",
        dateFrom: "2026-02-01",
      }).success,
    ).toBe(false);
    expect(
      manualTestRunHistoryQuerySchema.safeParse({
        projectId,
        period: "today",
        dateFrom: "2026-02-01",
      }).success,
    ).toBe(false);
    expect(
      manualTestRunHistoryQuerySchema.safeParse({
        projectId,
        period: "custom",
        dateFrom: "2026-02-02",
        dateTo: "2026-02-01",
      }).success,
    ).toBe(false);
  });

  it("requires at least one bulk operation and rejects unknown fields", () => {
    expect(
      manualTestRunScenarioBulkSchema.safeParse({ scenarioIds: [scenarioId] })
        .success,
    ).toBe(false);
    expect(
      manualTestRunScenarioBulkSchema.parse({
        scenarioIds: [scenarioId],
        result: "passed",
      }),
    ).toMatchObject({ result: "passed" });
    expect(
      manualTestRunCreateSchema.safeParse({
        suiteId: scenarioId,
        title: "unsafe",
        extra: "not allowed",
      }).success,
    ).toBe(false);
  });

  it("requires a nonblank name and accepts ordered environment properties", () => {
    expect(manualTestRunCreateSchema.parse({ suiteId: scenarioId })).toEqual({ suiteId: scenarioId });
    expect(manualTestRunCreateSchema.parse({ scenarioIds: [scenarioId] })).toEqual({ scenarioIds: [scenarioId] });
    expect(manualTestRunCreateSchema.safeParse({ scenarioIds: [scenarioId], title: "   " }).success).toBe(false);
    expect(manualTestRunCreateSchema.parse({
      scenarioIds: [scenarioId],
      title: "Browser run",
      environmentProperties: [
        { name: "Browser", value: "Firefox" },
        { name: "Region", value: "EU" },
      ],
    }).environmentProperties).toEqual([
      { name: "Browser", value: "Firefox" },
      { name: "Region", value: "EU" },
    ]);
  });

  it("validates the atomic run details contract", () => {
    expect(manualTestRunDetailsSchema.parse({
      title: "Edited run",
      scenarioIds: [scenarioId],
      environmentProperties: [{ name: "region", value: "EU" }],
    })).toEqual({
      title: "Edited run",
      scenarioIds: [scenarioId],
      environmentProperties: [{ name: "region", value: "EU" }],
    });
    expect(manualTestRunDetailsSchema.safeParse({
      title: "Edited run",
      scenarioIds: [],
      environmentProperties: [],
    }).success).toBe(false);
  });

  it("validates scenario and copied-step evidence writes", () => {
    expect(manualTestRunScenarioEvidenceSchema.parse({
      executionComment: "Investigated",
      defectReference: "BUG-42",
      steps: [{ id: scenarioId, comment: "Needs review", blockedFlag: true }],
    })).toMatchObject({ executionComment: "Investigated", defectReference: "BUG-42" });
    expect(manualTestRunScenarioEvidenceSchema.safeParse({}).success).toBe(false);
    expect(manualTestRunScenarioEvidenceSchema.safeParse({
      steps: [{ id: "not-a-uuid", failedFlag: true }],
    }).success).toBe(false);
  });

  it("rejects each step patch without an editable field, even alongside valid evidence", () => {
    const result = manualTestRunScenarioEvidenceSchema.safeParse({
      executionComment: "Investigated",
      steps: [{ id: projectId, failedFlag: false }, { id: scenarioId }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["steps", 1]);
    }
    expect(manualTestRunScenarioEvidenceSchema.safeParse({
      steps: [{ id: scenarioId, comment: undefined }],
    }).success).toBe(false);
  });

  it.each([
    { comment: null },
    { failedFlag: false },
    { failedComment: null },
    { blockedFlag: false },
    { blockedComment: null },
  ])("accepts a single cleared evidence field %o", (patch) => {
    expect(manualTestRunScenarioEvidenceSchema.safeParse({
      steps: [{ id: scenarioId, ...patch }],
    }).success).toBe(true);
  });
});
