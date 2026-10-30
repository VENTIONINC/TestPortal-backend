// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { parseActionInput } from "@/mcp/actionSchemas";
import { getIssuesSchema } from "@/mcp/schemas/issueSchemas";
import {
  listManualTestRunsSchema,
  updateManualTestRunSchema,
  startManualTestRunSchema,
} from "@/mcp/schemas/manualTestRunSchemas";

const projectId = "11111111-1111-4111-8111-111111111111";
const runId = "22222222-2222-4222-8222-222222222222";

describe("action input normalization", () => {
  it("preserves raw shape validation and unknown-key stripping", async () => {
    expect(
      await parseActionInput(getIssuesSchema, {
        projectId,
        page: "2",
        extra: true,
      }),
    ).toMatchObject({ projectId, page: "2" });
    await expect(
      parseActionInput(getIssuesSchema, { projectId, page: 2 }),
    ).rejects.toThrow();
    expect(await parseActionInput({}, { extra: true })).toEqual({});
  });

  it("retains numeric pagination, defaults, strictness and refinements", async () => {
    expect(
      await parseActionInput(listManualTestRunsSchema, { projectId }),
    ).toMatchObject({ page: 1, limit: 30 });
    await expect(
      parseActionInput(listManualTestRunsSchema, { projectId, page: "2" }),
    ).rejects.toThrow();
    await expect(
      parseActionInput(updateManualTestRunSchema, { projectId, runId }),
    ).rejects.toThrow();
    await expect(
      parseActionInput(updateManualTestRunSchema, {
        projectId,
        runId,
        notes: "ok",
        status: "passed",
      }),
    ).rejects.toThrow();
    await expect(
      parseActionInput(listManualTestRunsSchema, {
        projectId,
        startedFrom: "2026-10-02T00:00:00Z",
        startedBefore: "2026-10-01T00:00:00Z",
      }),
    ).rejects.toThrow();
  });

  it("preserves environment transformations", async () => {
    expect(
      await parseActionInput(startManualTestRunSchema, {
        projectId,
        scenarioId: runId,
        browser: "  ",
      }),
    ).toMatchObject({ browser: null });
  });
});
