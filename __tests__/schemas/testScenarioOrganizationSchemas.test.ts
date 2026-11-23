// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { bulkFolderBody, folderCreateBody, folderDeleteQuery, folderUpdateBody, memberBody, memberOrderBody, suiteMembershipChangeBody, suiteMoveBody } from "@/schemas/testScenarioOrganizationSchemas";

const projectId = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";

describe("test scenario organization schemas", () => {
  it("accepts null folder assignment for atomic unfiling", () => {
    expect(bulkFolderBody.safeParse({ projectId, scenarioIds: [id], folderId: null }).success).toBe(true);
  });

  it("rejects empty, oversized, and duplicate scenario batches", () => {
    expect(bulkFolderBody.safeParse({ projectId, scenarioIds: [], folderId: null }).success).toBe(false);
    expect(bulkFolderBody.safeParse({ projectId, scenarioIds: Array.from({ length: 101 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`), folderId: null }).success).toBe(false);
    expect(memberBody.safeParse({ projectId, scenarioIds: [id, id] }).success).toBe(false);
  });

  it("accepts complete suite changes above the legacy 100-ID limit", () => {
    const scenarioIds = Array.from({ length: 101 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`);
    const payload = { projectId, expectedMembershipRevision: 2, expectedScenarioIds: scenarioIds.slice(0, 100), addScenarioIds: scenarioIds.slice(100), removeScenarioIds: [] };
    expect(memberBody.safeParse({ projectId, scenarioIds }).success).toBe(false);
    expect(suiteMembershipChangeBody.safeParse(payload).success).toBe(true);
    expect(suiteMoveBody.safeParse({ projectId, sourceSuiteId: id, destinationSuiteId: projectId, scenarioIds, expectedSourceMembershipRevision: 1, expectedDestinationMembershipRevision: 0, expectedSourceScenarioIds: scenarioIds, expectedDestinationScenarioIds: [] }).success).toBe(true);
  });

  it("accepts legacy reorder requests and requires conditional fields together", () => {
    expect(memberOrderBody.safeParse({ projectId, scenarioIds: [id] }).success).toBe(true);
    expect(memberOrderBody.safeParse({ projectId, scenarioIds: [id], expectedMembershipRevision: 1 }).success).toBe(false);
  });

  it("rejects changes and moves that exceed the complete-order limit", () => {
    const ids = Array.from({ length: 10_000 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`);
    expect(suiteMembershipChangeBody.safeParse({ projectId, expectedMembershipRevision: 0, expectedScenarioIds: ids, addScenarioIds: [id], removeScenarioIds: [] }).success).toBe(false);
    expect(suiteMoveBody.safeParse({ projectId, sourceSuiteId: id, destinationSuiteId: projectId, scenarioIds: [id], expectedSourceMembershipRevision: 0, expectedDestinationMembershipRevision: 0, expectedSourceScenarioIds: [id], expectedDestinationScenarioIds: ids }).success).toBe(false);
  });

  it("accepts project-scoped subtree deletion and requires a non-empty patch", () => {
    expect(folderDeleteQuery.safeParse({ projectId }).success).toBe(true);
    expect(folderDeleteQuery.safeParse({ projectId, disposition: "unfiled" }).success).toBe(false);
    expect(folderUpdateBody.safeParse({ projectId }).success).toBe(false);
  });

  it("accepts optional folder descriptions and normalizes blank values to null", () => {
    expect(folderCreateBody.parse({ projectId, name: "Specs", description: "  Product coverage  " })).toEqual({ projectId, name: "Specs", description: "Product coverage" });
    expect(folderCreateBody.parse({ projectId, name: "Specs", description: "   " })).toEqual({ projectId, name: "Specs", description: null });
    expect(folderUpdateBody.parse({ projectId, description: null })).toEqual({ projectId, description: null });
    expect(folderUpdateBody.parse({ projectId, description: " " })).toEqual({ projectId, description: null });
    expect(folderUpdateBody.parse({ projectId, name: "Specs" })).not.toHaveProperty("description");
  });
});
