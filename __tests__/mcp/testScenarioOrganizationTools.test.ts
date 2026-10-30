// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
const service = {
  listFolders: jest.fn(),
  createFolder: jest.fn(),
  updateFolder: jest.fn(),
  deleteFolder: jest.fn(),
  moveScenarios: jest.fn(),
  listSuites: jest.fn(),
  getSuite: jest.fn(),
  createSuite: jest.fn(),
  updateSuite: jest.fn(),
  deleteSuite: jest.fn(),
  mutateMembers: jest.fn(),
  reorderMembers: jest.fn(),
};
jest.mock("@/services/testScenarioOrganizationService", () => ({
  testScenarioOrganizationService: service,
}));
import { organizationTools } from "@/mcp/tools/test-scenario-organization";

const projectId = "11111111-1111-4111-8111-111111111111";
const folderId = "22222222-2222-4222-8222-222222222222";
const suiteId = "33333333-3333-4333-8333-333333333333";
const scenarioIds = ["44444444-4444-4444-8444-444444444444"];
const invoke = async (id: string, args: object) => {
  const tool = organizationTools.find(([name]) => name === `testportal-${id}`);
  if (!tool) throw new Error(`missing ${id}`);
  return await (
    tool[3] as (
      input: object,
    ) => Promise<{ content: Array<{ text?: string }>; isError?: boolean }>
  )(args);
};

describe("organization MCP actions", () => {
  beforeEach(() => jest.clearAllMocks());
  it("delegates each action with its project scope and returns service responses", async () => {
    const cases = [
      ["list-test-scenario-folders", { projectId }, "listFolders", [projectId]],
      [
        "create-test-scenario-folder",
        { projectId, name: "Folder" },
        "createFolder",
        [{ projectId, name: "Folder" }],
      ],
      [
        "update-test-scenario-folder",
        { projectId, folderId, parentId: null },
        "updateFolder",
        [{ projectId, folderId, parentId: null }],
      ],
      [
        "delete-test-scenario-folder",
        { projectId, folderId, disposition: "parent" },
        "deleteFolder",
        [{ projectId, folderId, disposition: "parent" }],
      ],
      [
        "move-test-scenarios-to-folder",
        { projectId, scenarioIds, folderId: null },
        "moveScenarios",
        [{ projectId, scenarioIds, folderId: null }],
      ],
      ["list-test-suites", { projectId }, "listSuites", [projectId]],
      [
        "get-test-suite",
        { projectId, suiteId },
        "getSuite",
        [projectId, suiteId],
      ],
      [
        "create-test-suite",
        { projectId, name: "Suite" },
        "createSuite",
        [{ projectId, name: "Suite" }],
      ],
      [
        "update-test-suite",
        { projectId, suiteId, release: null },
        "updateSuite",
        [{ projectId, suiteId, release: null }],
      ],
      [
        "delete-test-suite",
        { projectId, suiteId },
        "deleteSuite",
        [projectId, suiteId],
      ],
      [
        "add-test-suite-members",
        { projectId, suiteId, scenarioIds },
        "mutateMembers",
        [{ projectId, suiteId, scenarioIds, operation: "add" }],
      ],
      [
        "remove-test-suite-members",
        { projectId, suiteId, scenarioIds },
        "mutateMembers",
        [{ projectId, suiteId, scenarioIds, operation: "remove" }],
      ],
      [
        "reorder-test-suite-members",
        { projectId, suiteId, scenarioIds },
        "reorderMembers",
        [{ projectId, suiteId, scenarioIds }],
      ],
    ] as const;
    for (const [id, args, method, expected] of cases) {
      service[method].mockReturnValueOnce(
        Promise.resolve({ ok: true }) as never,
      );
      const result = await invoke(id, args);
      expect(JSON.parse(result.content[0]?.text ?? "{}")).toEqual({ ok: true });
      expect(service[method]).toHaveBeenLastCalledWith(...expected);
    }
  });
  it("maps service failures to MCP errors", async () => {
    service.moveScenarios.mockReturnValueOnce(
      Promise.reject(new Error("Resource not found")) as never,
    );
    expect(
      await invoke("move-test-scenarios-to-folder", {
        projectId,
        folderId,
        scenarioIds,
      }),
    ).toMatchObject({ isError: true });
  });
});
