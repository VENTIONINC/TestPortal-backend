// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
const service = {
  listFolders: jest.fn(),
  createFolder: jest.fn(),
  updateFolder: jest.fn(),
  deleteSingleFolder: jest.fn(),
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
import { testUuid } from "@/test-utils/testUuid";

const projectId = testUuid(1);
const folderId = testUuid(2);
const suiteId = testUuid(3);
const scenarioId = testUuid(4);
const scenarioIds = [scenarioId];
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
      ],
      [
        "update-test-scenario-folder",
        { projectId, folderId, parentId: null },
        "updateFolder",
      ],
      [
        "delete-test-scenario-folder",
        { projectId, folderId, disposition: "parent" },
        "deleteSingleFolder",
      ],
      [
        "move-test-scenarios-to-folder",
        { projectId, scenarioIds, folderId: null },
        "moveScenarios",
      ],
      ["list-test-suites", { projectId }, "listSuites", [projectId]],
      [
        "get-test-suite",
        { projectId, suiteId },
        "getSuite",
        [projectId, suiteId],
      ],
      ["create-test-suite", { projectId, name: "Suite" }, "createSuite"],
      [
        "update-test-suite",
        { projectId, suiteId, release: null },
        "updateSuite",
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
      ],
    ] as const;

    for (const [id, args, method, expected] of cases) {
      const expectedArgs = expected ?? [structuredClone(args)];
      const expectedResponse =
        method === "moveScenarios" ? { moved: 1 } : { ok: true };
      const serviceResponse =
        method === "moveScenarios"
          ? { ...expectedResponse, restoreData: [{ scenarioId }] }
          : expectedResponse;
      service[method].mockReturnValueOnce(
        Promise.resolve(serviceResponse) as never,
      );
      const result = await invoke(id, args);
      expect(JSON.parse(result.content[0]?.text ?? "{}")).toEqual(
        expectedResponse,
      );
      expect(service[method]).toHaveBeenLastCalledWith(...expectedArgs);
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
