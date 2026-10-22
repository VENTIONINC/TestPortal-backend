// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { bulkFolderBody, folderDeleteQuery, folderUpdateBody, memberBody } from "@/schemas/testScenarioOrganizationSchemas";

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

  it("requires a folder deletion disposition and a non-empty patch", () => {
    expect(folderDeleteQuery.safeParse({ projectId }).success).toBe(false);
    expect(folderDeleteQuery.safeParse({ projectId, disposition: "unfiled" }).success).toBe(true);
    expect(folderUpdateBody.safeParse({ projectId }).success).toBe(false);
  });
});
