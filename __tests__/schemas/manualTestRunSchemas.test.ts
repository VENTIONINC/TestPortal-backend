// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import {
  manualTestRunCompleteSchema,
  manualTestRunCreateSchema,
  manualTestRunHistoryQuerySchema,
  manualTestRunReopenSchema,
  manualTestRunScenarioBulkSchema,
} from "@/schemas/manualTestRunSchemas";

const projectId = "11111111-1111-4111-8111-111111111111";
const scenarioId = "22222222-2222-4222-8222-222222222222";

describe("manual test run request schemas", () => {
  it("accepts exactly one source form and preserves selected scenario order", () => {
    const second = "33333333-3333-4333-8333-333333333333";
    const suite = "44444444-4444-4444-8444-444444444444";
    expect(
      manualTestRunCreateSchema.parse({ scenarioIds: [scenarioId, second] }),
    ).toEqual({ scenarioIds: [scenarioId, second] });
    expect(manualTestRunCreateSchema.parse({ suiteId: suite })).toEqual({
      suiteId: suite,
    });
    expect(manualTestRunCreateSchema.safeParse({}).success).toBe(false);
    expect(
      manualTestRunCreateSchema.safeParse({
        scenarioIds: [scenarioId],
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
        browser: " Chrome ",
        build: " 42 ",
        device: null,
      }),
    ).toEqual({
      scenarioIds: [scenarioId],
      browser: "Chrome",
      build: "42",
      device: null,
    });
    expect(
      manualTestRunCreateSchema.parse({
        suiteId: scenarioId,
        deployment: "stage",
      }),
    ).toEqual({ suiteId: scenarioId, deployment: "stage" });
    expect(
      manualTestRunCreateSchema.safeParse({
        suiteId: scenarioId,
        browser: "x".repeat(201),
      }).success,
    ).toBe(false);
    expect(
      manualTestRunCreateSchema.safeParse({
        suiteId: scenarioId,
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
      }).success,
    ).toBe(false);
  });
});
