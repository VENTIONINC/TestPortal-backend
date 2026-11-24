// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import {
  completeManualTestRunSchema,
  getManualTestRunSchema,
  listActiveUsersSchema,
  listManualTestRunsSchema,
  listTestScenarioManualRunsSchema,
  reassignManualTestRunExecutorSchema,
  startManualTestRunSchema,
  updateManualTestRunSchema,
  updateManualTestRunStepSchema,
} from "@/mcp/schemas/manualTestRunSchemas";
import { testUuid } from "@/test-utils/testUuid";

const projectId = testUuid(1);
const scenarioId = testUuid(2);
const runId = testUuid(3);
const stepId = testUuid(4);
const scope = { projectId, runId };
const source = { projectId, scenarioIds: [scenarioId] };
const details = {
  title: "Run",
  scenarioIds: [scenarioId],
  environmentProperties: [],
};

describe("manual run MCP schemas", () => {
  it("requires UUID scope, binds start fields to the request and rejects immutable/unknown input", () => {
    expect(startManualTestRunSchema.safeParse(source).success).toBe(true);
    expect(
      startManualTestRunSchema.safeParse({ ...source, projectId: "bad" })
        .success,
    ).toBe(false);

    for (const key of [
      "executedById",
      "status",
      "startedAt",
      "runKey",
      "steps",
    ]) {
      expect(
        startManualTestRunSchema.safeParse({ ...source, [key]: "spoof" })
          .success,
      ).toBe(false);
    }
    expect(
      startManualTestRunSchema.safeParse({
        ...source,
        browser: null,
        title: "Run",
      }).success,
    ).toBe(true);
    expect(
      startManualTestRunSchema.safeParse({ ...source, title: "   " }).success,
    ).toBe(false);
  });

  it("requires nonempty ordinary mutations and excludes every run status", () => {
    expect(getManualTestRunSchema.safeParse(scope).success).toBe(true);
    expect(
      getManualTestRunSchema.safeParse({ ...scope, extra: true }).success,
    ).toBe(false);
    expect(updateManualTestRunSchema.safeParse({ ...scope }).success).toBe(
      false,
    );
    expect(
      updateManualTestRunSchema.safeParse({ ...scope, ...details }).success,
    ).toBe(true);

    for (const status of [
      "in_progress",
      "passed",
      "failed",
      "blocked",
      "skipped",
    ]) {
      expect(
        updateManualTestRunSchema.safeParse({ ...scope, ...details, status })
          .success,
      ).toBe(false);
    }

    expect(
      updateManualTestRunStepSchema.safeParse({
        ...scope,
        scenarioId,
        stepId,
        failedFlag: true,
      }).success,
    ).toBe(true);
    expect(
      updateManualTestRunStepSchema.safeParse({ ...scope, scenarioId, stepId })
        .success,
    ).toBe(false);
    expect(
      completeManualTestRunSchema.safeParse({
        ...scope,
        requireAllMarked: true,
      }).success,
    ).toBe(true);
    expect(
      completeManualTestRunSchema.safeParse({ ...scope, status: "in_progress" })
        .success,
    ).toBe(false);
  });

  it("uses numeric pagination defaults and strictly validates history filters and date ranges", () => {
    expect(listManualTestRunsSchema.parse({ projectId })).toMatchObject({
      page: 1,
      limit: 30,
    });
    expect(
      listManualTestRunsSchema.safeParse({ projectId, page: "2" }).success,
    ).toBe(false);
    expect(
      listManualTestRunsSchema.safeParse({ projectId, page: 1.5 }).success,
    ).toBe(false);
    expect(
      listManualTestRunsSchema.safeParse({ projectId, limit: 101 }).success,
    ).toBe(false);
    expect(
      listManualTestRunsSchema.safeParse({ projectId, dateFrom: "2026-01-01" })
        .success,
    ).toBe(false);

    expect(
      listManualTestRunsSchema.safeParse({
        projectId,
        period: "custom",
        dateFrom: "2026-01-01",
      }).success,
    ).toBe(false);
    expect(
      listManualTestRunsSchema.safeParse({
        projectId,
        period: "custom",
        dateFrom: "2026-01-02",
        dateTo: "2026-01-01",
      }).success,
    ).toBe(false);
    expect(
      listManualTestRunsSchema.safeParse({ projectId, sourceScenarioKey: "  " })
        .success,
    ).toBe(false);
    expect(
      listTestScenarioManualRunsSchema.safeParse({
        projectId,
        scenarioId,
        testScenarioId: scenarioId,
      }).success,
    ).toBe(false);
  });

  it("accepts exactly empty directory input and scoped reassignment input", () => {
    expect(listActiveUsersSchema.safeParse({}).success).toBe(true);
    expect(listActiveUsersSchema.safeParse({ projectId }).success).toBe(false);

    expect(
      reassignManualTestRunExecutorSchema.safeParse({
        ...scope,
        scenarioId,
        assigneeId: scenarioId,
      }).success,
    ).toBe(true);
    expect(
      reassignManualTestRunExecutorSchema.safeParse({
        ...scope,
        scenarioId,
        assigneeId: "bad",
      }).success,
    ).toBe(false);
  });
});
