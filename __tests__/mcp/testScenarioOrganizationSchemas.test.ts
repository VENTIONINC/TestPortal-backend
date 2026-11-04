// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import * as s from "@/mcp/schemas/testScenarioOrganizationSchemas";

const projectId = "11111111-1111-4111-8111-111111111111";
const folderId = "22222222-2222-4222-8222-222222222222";
const suiteId = "33333333-3333-4333-8333-333333333333";
const scenarioIds = ["44444444-4444-4444-8444-444444444444"];

describe("organization MCP schemas", () => {
  it("enforces folder names, positions, update fields and deletion disposition", () => {
    expect(
      s.createFolderSchema.parse({
        projectId,
        name: "  Folder ",
        parentId: null,
        position: 0,
      }).name,
    ).toBe("Folder");
    for (const input of [
      { name: " " },
      { name: "x".repeat(201) },
      { name: "ok", position: -1 },
      { name: "ok", position: 1.5 },
      { name: "ok", extra: true },
    ])
      expect(
        s.createFolderSchema.safeParse({ projectId, ...input }).success,
      ).toBe(false);
    expect(
      s.updateFolderSchema.safeParse({ projectId, folderId }).success,
    ).toBe(false);
    expect(
      s.updateFolderSchema.safeParse({ projectId, folderId, parentId: null })
        .success,
    ).toBe(true);
    expect(
      s.deleteFolderSchema.safeParse({ projectId, folderId }).success,
    ).toBe(false);
    expect(
      s.deleteFolderSchema.safeParse({
        projectId,
        folderId,
        disposition: "parent",
      }).success,
    ).toBe(true);
  });
  it("bounds distinct move and membership IDs and allows an empty ordering", () => {
    for (const schema of [s.moveScenariosSchema, s.mutateMembersSchema]) {
      const input =
        schema === s.moveScenariosSchema
          ? { projectId, folderId: null }
          : { projectId, suiteId };
      expect(schema.safeParse({ ...input, scenarioIds }).success).toBe(true);
      for (const invalid of [
        [],
        [...scenarioIds, ...scenarioIds],
        Array.from(
          { length: 101 },
          (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
        ),
      ])
        expect(
          schema.safeParse({ ...input, scenarioIds: invalid }).success,
        ).toBe(false);
    }
    expect(
      s.moveScenariosSchema.safeParse({ projectId, scenarioIds }).success,
    ).toBe(false);
    expect(
      s.reorderMembersSchema.safeParse({ projectId, suiteId, scenarioIds: [] })
        .success,
    ).toBe(true);
    expect(
      s.reorderMembersSchema.safeParse({
        projectId,
        suiteId,
        scenarioIds: [...scenarioIds, ...scenarioIds],
      }).success,
    ).toBe(false);
  });
  it("distinguishes omitted and null suite metadata", () => {
    expect(
      s.createSuiteSchema.parse({
        projectId,
        name: "Suite",
        description: null,
      }),
    ).toEqual({ projectId, name: "Suite", description: null });
    expect(s.updateSuiteSchema.safeParse({ projectId, suiteId }).success).toBe(
      false,
    );
    expect(
      s.updateSuiteSchema.parse({ projectId, suiteId, release: null }),
    ).toEqual({ projectId, suiteId, release: null });
    expect(
      s.getSuiteSchema.safeParse({ projectId, suiteId: "bad" }).success,
    ).toBe(false);
  });
});
