// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import {
  completeManualTestRunSchema, getManualTestRunSchema, listActiveUsersSchema,
  listManualTestRunsSchema, listTestScenarioManualRunsSchema,
  reassignManualTestRunExecutorSchema, startManualTestRunSchema,
  updateManualTestRunSchema, updateManualTestRunStepSchema,
} from "@/mcp/schemas/manualTestRunSchemas";

const projectId = "11111111-1111-4111-8111-111111111111";
const scenarioId = "22222222-2222-4222-8222-222222222222";
const runId = "33333333-3333-4333-8333-333333333333";
const stepId = "44444444-4444-4444-8444-444444444444";
const scope = { projectId, runId };

describe("manual run MCP schemas", () => {
  it("requires UUID scope, binds start fields to the request and rejects immutable/unknown input", () => {
    expect(startManualTestRunSchema.safeParse({ projectId, scenarioId }).success).toBe(true);
    expect(startManualTestRunSchema.safeParse({ projectId: "bad", scenarioId }).success).toBe(false);
    for (const key of ["executedById", "status", "startedAt", "title", "steps"]) {
      expect(startManualTestRunSchema.safeParse({ projectId, scenarioId, [key]: "spoof" }).success).toBe(false);
    }
    expect(startManualTestRunSchema.safeParse({ projectId, scenarioId, browser: null, notes: null }).success).toBe(true);
    expect(startManualTestRunSchema.safeParse({ projectId, scenarioId, notes: "   " }).success).toBe(false);
  });

  it("requires nonempty ordinary mutations and excludes every run status", () => {
    expect(getManualTestRunSchema.safeParse(scope).success).toBe(true);
    expect(getManualTestRunSchema.safeParse({ ...scope, extra: true }).success).toBe(false);
    expect(updateManualTestRunSchema.safeParse({ ...scope }).success).toBe(false);
    expect(updateManualTestRunSchema.safeParse({ ...scope, notes: null }).success).toBe(true);
    for (const status of ["in_progress", "passed", "failed", "blocked", "skipped"]) {
      expect(updateManualTestRunSchema.safeParse({ ...scope, status, notes: "changed" }).success).toBe(false);
    }
    expect(updateManualTestRunStepSchema.safeParse({ ...scope, stepId, status: "passed" }).success).toBe(true);
    expect(updateManualTestRunStepSchema.safeParse({ ...scope, stepId }).success).toBe(false);
    expect(completeManualTestRunSchema.safeParse({ ...scope, status: "passed" }).success).toBe(true);
    expect(completeManualTestRunSchema.safeParse({ ...scope, status: "in_progress" }).success).toBe(false);
  });

  it("uses numeric pagination defaults and strictly validates history filters and date ranges", () => {
    expect(listManualTestRunsSchema.parse({ projectId })).toMatchObject({ page: 1, limit: 30 });
    expect(listManualTestRunsSchema.safeParse({ projectId, page: "2" }).success).toBe(false);
    expect(listManualTestRunsSchema.safeParse({ projectId, page: 1.5 }).success).toBe(false);
    expect(listManualTestRunsSchema.safeParse({ projectId, limit: 101 }).success).toBe(false);
    expect(listManualTestRunsSchema.safeParse({ projectId, startedFrom: "2026-01-01T00:00:00" }).success).toBe(false);
    expect(listManualTestRunsSchema.safeParse({ projectId, startedFrom: "2026-02-31T00:00:00Z" }).success).toBe(false);
    expect(listManualTestRunsSchema.safeParse({ projectId, startedFrom: "2026-01-02T00:00:00Z", startedBefore: "2026-01-01T00:00:00Z" }).success).toBe(false);
    expect(listManualTestRunsSchema.safeParse({ projectId, sourceScenarioKey: "  " }).success).toBe(false);
    expect(listTestScenarioManualRunsSchema.safeParse({ projectId, scenarioId, testScenarioId: scenarioId }).success).toBe(false);
  });

  it("accepts exactly empty directory input and scoped reassignment input", () => {
    expect(listActiveUsersSchema.safeParse({}).success).toBe(true);
    expect(listActiveUsersSchema.safeParse({ projectId }).success).toBe(false);
    expect(reassignManualTestRunExecutorSchema.safeParse({ ...scope, executedById: scenarioId }).success).toBe(true);
    expect(reassignManualTestRunExecutorSchema.safeParse({ ...scope, executedById: "bad" }).success).toBe(false);
  });
});
