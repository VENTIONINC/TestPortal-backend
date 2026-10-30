// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { createActionCatalog, indexActions } from "@/mcp/actionCatalog";
import {
  actionAreas,
  actionKeywords,
  describeAction,
} from "@/mcp/actionMetadata";

describe("session action catalog", () => {
  it("contains exactly the operations registered by the baseline server", () => {
    expect([...createActionCatalog("actor").keys()].sort()).toEqual([
      "testportal-add-test-suite-members",
      "testportal-append-test-scenario-step",
      "testportal-assign-issue-to-result-error",
      "testportal-bulk-review-result-errors",
      "testportal-check-status",
      "testportal-complete-manual-test-run",
      "testportal-create-assumption",
      "testportal-create-issue",
      "testportal-create-manual-run-environment-profile",
      "testportal-create-test-scenario",
      "testportal-create-test-scenario-folder",
      "testportal-create-test-suite",
      "testportal-current-time",
      "testportal-delete-manual-run-environment-profile",
      "testportal-delete-test-scenario",
      "testportal-delete-test-scenario-folder",
      "testportal-delete-test-scenario-step",
      "testportal-delete-test-suite",
      "testportal-get-assumption-by-id",
      "testportal-get-available-projects",
      "testportal-get-execution-by-id",
      "testportal-get-issue-by-id",
      "testportal-get-issues",
      "testportal-get-manual-test-run",
      "testportal-get-result-by-id",
      "testportal-get-result-error-by-id",
      "testportal-get-results",
      "testportal-get-results-stats",
      "testportal-get-spec-by-id",
      "testportal-get-test-scenario",
      "testportal-get-test-suite",
      "testportal-list-active-users",
      "testportal-list-manual-run-environment-profiles",
      "testportal-list-manual-test-runs",
      "testportal-list-test-scenario-folders",
      "testportal-list-test-scenario-manual-runs",
      "testportal-list-test-scenarios",
      "testportal-list-test-suites",
      "testportal-move-test-scenarios-to-folder",
      "testportal-reassign-manual-test-run-executor",
      "testportal-remove-test-suite-members",
      "testportal-reorder-test-scenario-steps",
      "testportal-reorder-test-suite-members",
      "testportal-review-result-error",
      "testportal-start-manual-test-run",
      "testportal-update-assumption",
      "testportal-update-manual-run-environment-profile",
      "testportal-update-manual-test-run",
      "testportal-update-manual-test-run-step",
      "testportal-update-test-scenario",
      "testportal-update-test-scenario-folder",
      "testportal-update-test-scenario-step",
      "testportal-update-test-suite",
    ]);
  });

  it("rejects duplicate action IDs", () => {
    const action = [...createActionCatalog("actor").values()][0];
    expect(action).toBeDefined();
    if (!action) throw new Error("Expected a catalog action");
    expect(() => indexActions([action, action])).toThrow(
      "Duplicate MCP action",
    );
    expect(() => actionAreas("testportal-unclassified")).toThrow(
      "Missing or conflicting area metadata",
    );
  });

  it("exports self-contained input contracts for all actions", () => {
    const actions = [...createActionCatalog("actor").values()].map(
      describeAction,
    );
    for (const action of actions) {
      expect(JSON.stringify(action.inputSchema)).not.toContain('"$ref"');
      expect(action.areas.length).toBeGreaterThan(0);
      expect(action.areas.every((area) => ["core", "tms"].includes(area))).toBe(
        true,
      );
      expect(
        action.description && action.effects.length && action.responseSummary,
      ).toBeTruthy();
    }
    for (const id of [
      "testportal-get-available-projects",
      "testportal-check-status",
      "testportal-current-time",
    ]) {
      expect(actions.filter(({ actionId }) => actionId === id)).toHaveLength(1);
      expect(actions.find(({ actionId }) => actionId === id)?.areas).toEqual([
        "core",
        "tms",
      ]);
    }
    expect(actionKeywords("testportal-update-manual-test-run-step")).toContain(
      "manual step outcome",
    );
    const update = actions.find(
      ({ actionId }) => actionId === "testportal-update-manual-test-run",
    );
    expect(update?.constraints).toContain(
      "At least one editable field is required.",
    );
    expect(JSON.stringify(update?.inputSchema)).toContain('"type":"null"');
    expect(JSON.stringify(update?.inputSchema)).not.toContain('"status"');
    const updateSchema = update?.inputSchema as {
      required: string[];
      additionalProperties: boolean;
    };
    expect(updateSchema.required).toEqual(
      expect.arrayContaining(["projectId", "runId"]),
    );
    expect(updateSchema.required).not.toContain("notes");
    expect(updateSchema.additionalProperties).toBe(false);
    const core = actions.find(
      ({ actionId }) => actionId === "testportal-get-issues",
    );
    expect(
      (core?.inputSchema as { additionalProperties: boolean })
        .additionalProperties,
    ).toBe(true);
  });
});
