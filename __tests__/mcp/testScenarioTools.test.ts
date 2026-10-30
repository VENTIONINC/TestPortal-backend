// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import type { MCPToolResponse } from "@/types";
import type {
  TestScenarioMcpDeleteResponse,
  TestScenarioMcpDetailResponse,
  TestScenarioMcpListParams,
  TestScenarioSummaryListResponse,
  TestScenarioResponse,
} from "@/types/testScenarios";

const listMock =
  jest.fn<
    (
      params: TestScenarioMcpListParams,
    ) => Promise<TestScenarioSummaryListResponse>
  >();
const getMock = jest.fn<() => Promise<TestScenarioMcpDetailResponse>>();
const updateMock = jest.fn<() => Promise<TestScenarioResponse>>();
const deleteMock = jest.fn<() => Promise<TestScenarioMcpDeleteResponse>>();
const appendStepMock = jest.fn<() => Promise<TestScenarioResponse>>();
const updateStepMock = jest.fn<() => Promise<TestScenarioResponse>>();
const deleteStepMock = jest.fn<() => Promise<TestScenarioResponse>>();
const reorderStepsMock = jest.fn<() => Promise<TestScenarioResponse>>();

jest.mock("@/handlers/mcpTestScenarioHandler", () => ({
  mcpTestScenarioHandler: {
    createTestScenario: updateMock,
    listTestScenarios: listMock,
    getTestScenario: getMock,
    updateTestScenario: updateMock,
    deleteTestScenario: deleteMock,
    appendTestScenarioStep: appendStepMock,
    updateTestScenarioStep: updateStepMock,
    deleteTestScenarioStep: deleteStepMock,
    reorderTestScenarioSteps: reorderStepsMock,
  },
}));

import {
  createTestScenarioTool,
  deleteTestScenario,
  getTestScenario,
  listTestScenarios,
  updateTestScenario,
  appendTestScenarioStep,
  updateTestScenarioStep,
  deleteTestScenarioStep,
  reorderTestScenarioSteps,
} from "@/mcp/tools/test-scenarios";

const projectId = "11111111-1111-1111-1111-111111111111";
const scenarioId = "22222222-2222-2222-2222-222222222222";
const scenario: TestScenarioResponse = {
  id: scenarioId,
  projectId,
  createdById: "33333333-3333-3333-3333-333333333333",
  title: "Login",
  scenarioKey: null,
  contentMd: "# Login\n\n  exact ✓\n",
  details: null,
  preconditions: null,
  testData: null,
  priority: null,
  relatedIssueUrl: null,
  contentMdHash:
    "0000000000000000000000000000000000000000000000000000000000000000",
  contentMdFormatVersion: 1,
  steps: [],
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};
const detail: TestScenarioMcpDetailResponse = {
  scenario,
  resultEvidence: {
    scenarioId,
    projectId,
    linkedSpecCount: 1,
    results: [],
    total: 0,
    page: 1,
    limit: 30,
    totalPages: 0,
  },
  issueEvidence: {
    scenarioId,
    projectId,
    linkedSpecCount: 1,
    issues: [],
    total: 0,
    page: 1,
    limit: 30,
    totalPages: 0,
  },
};

const responseData = async (response: MCPToolResponse): Promise<unknown> => {
  const text = response.content[0]?.text;
  if (!text) throw new Error("Missing MCP response text");
  return JSON.parse(text) as unknown;
};

describe("Test Scenario MCP tools", () => {
  it("binds creation to the trusted actor and rejects caller supplied creator", async () => {
    updateMock.mockResolvedValue(scenario);
    const tool = createTestScenarioTool(scenario.createdById);
    const input = {
      projectId,
      title: "Case",
      priority: "high" as const,
      steps: [],
    };
    await tool[3](input);
    expect(updateMock).toHaveBeenCalledWith({
      ...input,
      createdById: scenario.createdById,
    });
    updateMock.mockClear();
    const response = await tool[3]({
      ...input,
      createdById: scenarioId,
    } as typeof input);
    expect(response).toMatchObject({ isError: true });
    expect(updateMock).not.toHaveBeenCalled();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    listMock.mockResolvedValue({
      scenarios: [],
      total: 0,
      page: 1,
      limit: 30,
      totalPages: 0,
    });
    getMock.mockResolvedValue(detail);
    updateMock.mockResolvedValue(scenario);
    deleteMock.mockResolvedValue({ scenarioId, projectId, deleted: true });
    appendStepMock.mockResolvedValue(scenario);
    updateStepMock.mockResolvedValue(scenario);
    deleteStepMock.mockResolvedValue(scenario);
    reorderStepsMock.mockResolvedValue(scenario);
  });

  it("serializes successful responses as JSON text for all four tools", async () => {
    const listResponse = (await listTestScenarios[3]({
      projectId,
    })) as MCPToolResponse;
    const detailResponse = (await getTestScenario[3]({
      scenarioId,
      projectId,
    })) as MCPToolResponse;
    const updateResponse = (await updateTestScenario[3]({
      scenarioId,
      projectId,
      details: "Updated details",
    })) as MCPToolResponse;
    const deleteResponse = (await deleteTestScenario[3]({
      scenarioId,
      projectId,
    })) as MCPToolResponse;

    await expect(responseData(listResponse)).resolves.toEqual({
      scenarios: [],
      total: 0,
      page: 1,
      limit: 30,
      totalPages: 0,
    });
    await expect(responseData(detailResponse)).resolves.toEqual(
      JSON.parse(JSON.stringify(detail)) as unknown,
    );
    await expect(responseData(updateResponse)).resolves.toEqual(
      JSON.parse(JSON.stringify(scenario)) as unknown,
    );
    await expect(responseData(deleteResponse)).resolves.toEqual({
      scenarioId,
      projectId,
      deleted: true,
    });
  });

  it("forwards all catalog filters to the shared MCP list path", async () => {
    const params: TestScenarioMcpListParams = {
      projectId,
      page: 2,
      limit: 10,
      search: "PAY-42",
      createdById: "33333333-3333-3333-3333-333333333333",
      sort: "title_asc",
    };

    await listTestScenarios[3](params);

    expect(listMock).toHaveBeenCalledWith(params);
  });

  it.each([
    [updateTestScenario, { scenarioId, projectId }, "validation"],
    [getTestScenario, { scenarioId, projectId }, "not-found"],
    [deleteTestScenario, { scenarioId, projectId }, "cross-project"],
  ])(
    "returns a standard isError response for %s failures",
    async (tool, params, kind) => {
      const failure = new Error(`${kind} service failure`);
      if (kind === "validation") {
        updateMock.mockRejectedValue(failure);
      } else if (kind === "not-found") {
        getMock.mockRejectedValue(failure);
      } else {
        deleteMock.mockRejectedValue(failure);
      }

      const toolHandler = tool[3] as unknown as (
        input: unknown,
      ) => Promise<MCPToolResponse>;
      const response = await toolHandler(params);

      expect(response).toMatchObject({ isError: true });
      expect(response.content[0]?.text).toContain(
        `Error ${kind === "validation" ? "updating" : kind === "not-found" ? "fetching" : "deleting"} Test Scenario: ${kind} service failure`,
      );
    },
  );

  it("exposes scenario CRUD tools", () => {
    expect([
      createTestScenarioTool(scenario.createdById)[0],
      listTestScenarios[0],
      getTestScenario[0],
      updateTestScenario[0],
      deleteTestScenario[0],
    ]).toEqual([
      "testportal-create-test-scenario",
      "testportal-list-test-scenarios",
      "testportal-get-test-scenario",
      "testportal-update-test-scenario",
      "testportal-delete-test-scenario",
    ]);
  });

  it("returns complete scenario success envelopes for all step tools", async () => {
    const stepId = "44444444-4444-4444-4444-444444444444";
    const args = { projectId, scenarioId };
    const responses = await Promise.all([
      appendTestScenarioStep[3]({ ...args, action: "Open" }),
      updateTestScenarioStep[3]({ ...args, stepId, action: "Submit" }),
      deleteTestScenarioStep[3]({ ...args, stepId }),
      reorderTestScenarioSteps[3]({ ...args, stepIds: [stepId] }),
    ]);
    for (const response of responses) {
      expect(response).not.toHaveProperty("isError", true);
      await expect(responseData(response as MCPToolResponse)).resolves.toEqual(
        JSON.parse(JSON.stringify(scenario)) as unknown,
      );
    }
  });

  it("prefixes static and authenticated tool definitions exactly once", () => {
    const names = [
      createTestScenarioTool(scenario.createdById)[0],
      listTestScenarios[0],
      getTestScenario[0],
      appendTestScenarioStep[0],
      updateTestScenarioStep[0],
      deleteTestScenarioStep[0],
      reorderTestScenarioSteps[0],
    ];

    expect(names.every((name) => name.startsWith("testportal-"))).toBe(true);
    expect(
      names.every((name) => !name.startsWith("testportal-testportal-")),
    ).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });

  it("advertises all nine scenario tool names", () => {
    expect([
      createTestScenarioTool(scenario.createdById)[0],
      listTestScenarios[0],
      getTestScenario[0],
      updateTestScenario[0],
      deleteTestScenario[0],
      appendTestScenarioStep[0],
      updateTestScenarioStep[0],
      deleteTestScenarioStep[0],
      reorderTestScenarioSteps[0],
    ]).toEqual([
      "testportal-create-test-scenario",
      "testportal-list-test-scenarios",
      "testportal-get-test-scenario",
      "testportal-update-test-scenario",
      "testportal-delete-test-scenario",
      "testportal-append-test-scenario-step",
      "testportal-update-test-scenario-step",
      "testportal-delete-test-scenario-step",
      "testportal-reorder-test-scenario-steps",
    ]);
  });

  it("maps failures from each step service through standard MCP error envelopes", async () => {
    const stepId = "44444444-4444-4444-4444-444444444444";
    const calls = [
      [appendTestScenarioStep, appendStepMock, { projectId, scenarioId, action: "Open" }, "appending"],
      [updateTestScenarioStep, updateStepMock, { projectId, scenarioId, stepId, action: "Open" }, "updating"],
      [deleteTestScenarioStep, deleteStepMock, { projectId, scenarioId, stepId }, "deleting"],
      [reorderTestScenarioSteps, reorderStepsMock, { projectId, scenarioId, stepIds: [stepId] }, "reordering"],
    ] as const;
    for (const [tool, serviceMock, input, label] of calls) {
      serviceMock.mockRejectedValueOnce(new Error("service rejected"));
      const response = await (tool[3] as unknown as (
        params: unknown,
      ) => Promise<MCPToolResponse>)(input);
      expect(response.isError).toBe(true);
      expect(response.content[0]?.text).toContain(`Error ${label} Test Scenario step`);
    }
  });
});
