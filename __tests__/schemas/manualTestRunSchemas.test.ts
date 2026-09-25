// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import {
  manualTestRunCompleteSchema,
  manualTestRunHistoryQuerySchema,
  manualTestRunScenarioHistoryQuerySchema,
  manualTestRunStartSchema,
  manualTestRunStepUpdateSchema,
  manualTestRunUpdateSchema,
} from "@/schemas/manualTestRunSchemas";

const projectId = "11111111-1111-4111-8111-111111111111";

describe("manual test run request schemas", () => {
  it("accepts an empty start body and trims optional notes", () => {
    expect(manualTestRunStartSchema.parse({})).toEqual({});
    expect(manualTestRunStartSchema.parse({ notes: "  started  " })).toEqual({
      notes: "started",
    });
  });

  it("rejects client-owned identity, snapshot, and unknown fields", () => {
    expect(
      manualTestRunStartSchema.safeParse({ executedById: projectId }).success,
    ).toBe(false);
    expect(
      manualTestRunUpdateSchema.safeParse({ title: "changed" }).success,
    ).toBe(false);
    expect(
      manualTestRunStepUpdateSchema.safeParse({}).success,
    ).toBe(false);
  });

  it("requires valid editable statuses and supports null note clearing", () => {
    expect(
      manualTestRunUpdateSchema.parse({ status: "in_progress", notes: null }),
    ).toEqual({ status: "in_progress", notes: null });
    expect(
      manualTestRunStepUpdateSchema.parse({ status: "not_started", notes: null }),
    ).toEqual({ status: "not_started", notes: null });
    expect(
      manualTestRunCompleteSchema.safeParse({ status: "in_progress" }).success,
    ).toBe(false);
  });

  it("parses bounded history queries and rejects invalid/repeated ranges", () => {
    expect(
      manualTestRunHistoryQuerySchema.parse({
        projectId,
        startedFrom: "2026-01-01T00:00:00+02:00",
        startedBefore: "2026-01-02T00:00:00Z",
        status: "failed",
      }),
    ).toMatchObject({ projectId, page: 1, limit: 30, status: "failed" });

    expect(
      manualTestRunHistoryQuerySchema.safeParse({
        projectId,
        startedFrom: "2026-01-01",
      }).success,
    ).toBe(false);
    expect(
      manualTestRunHistoryQuerySchema.safeParse({
        projectId,
        startedFrom: "2026-01-02T00:00:00Z",
        startedBefore: "2026-01-01T00:00:00Z",
      }).success,
    ).toBe(false);
    expect(
      manualTestRunHistoryQuerySchema.safeParse({
        projectId,
        status: ["failed", "passed"],
      }).success,
    ).toBe(false);
  });

  it("does not allow a redundant scenario filter on nested history", () => {
    expect(
      manualTestRunScenarioHistoryQuerySchema.safeParse({
        projectId,
        testScenarioId: projectId,
      }).success,
    ).toBe(false);
  });
});
