// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { zodToJsonSchema } from "zod-to-json-schema";
import { normalizeActionSchema } from "@/mcp/actionSchemas";
import type { ActionTool } from "@/mcp/actionCatalog";

export type ActionArea = "core" | "tms";
export interface ActionDefinition {
  actionId: string;
  areas: ActionArea[];
  description: string;
  inputSchema: object;
  constraints: string[];
  effects: string[];
  responseSummary: string;
  relatedActionIds: string[];
}

/** Search vocabulary stays private and does not inflate returned contracts. */
export const actionKeywords = (id: string): string[] => {
  const words: string[] = [];
  if (id.includes("test-scenario"))
    words.push("test case", "test cases", "scenario");
  if (id.includes("manual-test-run") || id.includes("manual-runs"))
    words.push("manual execution", "manual run", "record outcome");
  if (id.includes("manual-test-run-step"))
    words.push("manual step outcome", "record step result");
  if (id.includes("folder")) words.push("folder", "folders", "hierarchy", "unfiled");
  if (id.includes("suite")) words.push("suite", "suites", "membership");
  if (id.includes("environment-profile")) words.push("environment", "profile");
  if (id === "testportal-get-available-projects")
    words.push("projects", "project discovery", "available projects");
  return words;
};

const shared = new Set([
  "testportal-check-status",
  "testportal-current-time",
  "testportal-get-available-projects",
]);
const core = new Set([
  "testportal-get-issues",
  "testportal-get-issue-by-id",
  "testportal-create-issue",
  "testportal-get-results",
  "testportal-get-result-by-id",
  "testportal-get-results-stats",
  "testportal-create-assumption",
  "testportal-update-assumption",
  "testportal-get-assumption-by-id",
  "testportal-get-execution-by-id",
  "testportal-assign-issue-to-result-error",
  "testportal-review-result-error",
  "testportal-bulk-review-result-errors",
  "testportal-get-result-error-by-id",
  "testportal-get-spec-by-id",
]);
const tms = new Set([
  "testportal-list-test-scenario-folders",
  "testportal-create-test-scenario-folder",
  "testportal-update-test-scenario-folder",
  "testportal-delete-test-scenario-folder",
  "testportal-move-test-scenarios-to-folder",
  "testportal-list-test-suites",
  "testportal-get-test-suite",
  "testportal-create-test-suite",
  "testportal-update-test-suite",
  "testportal-delete-test-suite",
  "testportal-add-test-suite-members",
  "testportal-remove-test-suite-members",
  "testportal-reorder-test-suite-members",
  "testportal-create-test-scenario",
  "testportal-list-test-scenarios",
  "testportal-get-test-scenario",
  "testportal-update-test-scenario",
  "testportal-delete-test-scenario",
  "testportal-append-test-scenario-step",
  "testportal-update-test-scenario-step",
  "testportal-delete-test-scenario-step",
  "testportal-reorder-test-scenario-steps",
  "testportal-start-manual-test-run",
  "testportal-get-manual-test-run",
  "testportal-update-manual-test-run",
  "testportal-update-manual-test-run-step",
  "testportal-complete-manual-test-run",
  "testportal-list-manual-test-runs",
  "testportal-list-test-scenario-manual-runs",
  "testportal-list-active-users",
  "testportal-reassign-manual-test-run-executor",
  "testportal-create-manual-run-environment-profile",
  "testportal-list-manual-run-environment-profiles",
  "testportal-update-manual-run-environment-profile",
  "testportal-delete-manual-run-environment-profile",
]);
const mutation =
  /testportal-(?:create|update|delete|append|reorder|add|remove|move|start|complete|reassign|assign|review|bulk-review)-/;
const destructive = /testportal-delete-/;

const responseSummary = (id: string): string => {
  if (id === "testportal-get-available-projects")
    return "Returns active projects and their IDs.";
  if (id === "testportal-check-status")
    return "Returns server status and timestamp.";
  if (id === "testportal-current-time")
    return "Returns the current date and timestamp.";
  if (id === "testportal-delete-manual-run-environment-profile")
    return "Returns profile deletion confirmation.";
  if (id === "testportal-list-manual-run-environment-profiles")
    return "Returns shared project profiles.";
  if (id.includes("environment-profile"))
    return "Returns the created or updated profile.";
  if (id === "testportal-list-active-users")
    return "Returns active executor IDs, names and email addresses.";
  if (
    id === "testportal-list-manual-test-runs" ||
    id === "testportal-list-test-scenario-manual-runs"
  )
    return "Returns paginated run history.";
  if (id.includes("manual-test-run"))
    return "Returns the saved run with its snapshot and outcomes.";
  if (id === "testportal-list-test-scenario-folders") return "Returns the project folder tree with direct scenario counts.";
  if (id === "testportal-move-test-scenarios-to-folder") return "Returns the moved scenario count.";
  if (id.includes("test-scenario-folder")) return id.includes("delete-") ? "Returns folder deletion confirmation." : "Returns the created or updated folder.";
  if (id.includes("test-suite-members")) return id.includes("reorder-") ? "Returns the ordered scenario IDs." : "Returns the ordered suite members.";
  if (id.includes("test-suite")) return id.includes("delete-") ? "Returns suite deletion confirmation." : id.includes("list-") || id.includes("get-") ? "Returns suite metadata and ordered members." : "Returns the created or updated suite metadata.";
  if (id === "testportal-list-test-scenarios")
    return "Returns paginated scenario summaries.";
  if (id === "testportal-get-test-scenario")
    return "Returns scenario detail and paginated Result and Issue evidence.";
  if (id === "testportal-delete-test-scenario")
    return "Returns scenario deletion confirmation.";
  if (id.includes("test-scenario"))
    return "Returns the complete created or updated scenario.";
  if (id.includes("result-error"))
    return "Returns result-error data or the result of the requested review or assignment.";
  if (id.includes("assumption"))
    return "Returns assumption data or the updated assumption.";
  if (id.includes("issue"))
    return "Returns issue data or paginated issue results.";
  if (id.includes("result"))
    return "Returns result detail, a results page, or statistics.";
  if (id.includes("execution")) return "Returns execution detail.";
  return "Returns Spec detail.";
};

export const actionAreas = (actionId: string): ActionArea[] => {
  if ([shared, core, tms].filter((group) => group.has(actionId)).length !== 1) {
    throw new Error(
      `Missing or conflicting area metadata for MCP action: ${actionId}`,
    );
  }
  const areas: ActionArea[] = shared.has(actionId)
    ? ["core", "tms"]
    : core.has(actionId)
      ? ["core"]
      : tms.has(actionId)
        ? ["tms"]
        : [];
  return areas;
};

export const describeAction = ([
  actionId,
  description,
  schema,
]: ActionTool): ActionDefinition => {
  const areas = actionAreas(actionId);
  const constraints: string[] = [];
  if (
    /testportal-update-(?:test-scenario|test-scenario-step|manual-test-run|manual-test-run-step|manual-run-environment-profile)$/.test(
      actionId,
    )
  )
    constraints.push("At least one editable field is required.");
  if (
    /testportal-list-(?:manual-test-runs|test-scenario-manual-runs)$/.test(
      actionId,
    )
  )
    constraints.push(
      "Date bounds require RFC 3339 timestamps with timezones; startedFrom must be earlier than startedBefore.",
    );
  if (/testportal-update-(?:test-scenario-folder|test-suite)$/.test(actionId)) constraints.push("At least one editable field is required.");
  if (/testportal-(?:add|remove)-test-suite-members|testportal-move-test-scenarios-to-folder/.test(actionId)) constraints.push("Provide 1–100 distinct scenario UUIDs in the same project.");
  if (actionId === "testportal-reorder-test-suite-members") constraints.push("Provide every current member exactly once in the desired order.");
  if (actionId === "testportal-delete-test-scenario-folder") constraints.push("Disposition is required: parent or unfiled.");
  if (actionId === "testportal-list-test-scenarios")
    constraints.push(
      "sortDirection requires sortField; sort and sortField cannot be combined.",
    );
  if (/manual-test-run/.test(actionId))
    constraints.push(
      "Records manual execution; browser and API tests run on the client.",
    );
  const effects =
    actionId === "testportal-update-assumption"
      ? ["Changes an assumption; setting isConfirmed to false deletes it."]
      : mutation.test(actionId)
        ? [destructive.test(actionId) ? "Deletes data." : "Changes data."]
        : ["Reads data without mutation."];
  return {
    actionId,
    areas,
    description,
    inputSchema: zodToJsonSchema(normalizeActionSchema(schema), {
      $refStrategy: "none",
      effectStrategy: "input",
      removeAdditionalStrategy: "strict",
    }),
    constraints,
    effects,
    responseSummary: responseSummary(actionId),
    relatedActionIds:
      actionId === "testportal-get-test-scenario"
        ? ["testportal-get-result-by-id", "testportal-get-issue-by-id"]
        : actionId.includes("manual-test-run")
          ? ["testportal-get-test-scenario"]
          : [],
  };
};
