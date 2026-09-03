// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import type { MCPToolResponse } from "@/types";
import type {
  TestScenarioMcpDeleteResponse,
  TestScenarioMcpDetailResponse,
  TestScenarioSummaryListResponse,
  TestScenarioResponse,
} from "@/types/testScenarios";

const listMock = jest.fn<() => Promise<TestScenarioSummaryListResponse>>();
const getMock = jest.fn<() => Promise<TestScenarioMcpDetailResponse>>();
const updateMock = jest.fn<() => Promise<TestScenarioResponse>>();
const deleteMock = jest.fn<() => Promise<TestScenarioMcpDeleteResponse>>();

jest.mock("@/handlers/mcpTestScenarioHandler", () => ({
  mcpTestScenarioHandler: {
    listTestScenarios: listMock,
    getTestScenario: getMock,
    updateTestScenario: updateMock,
    deleteTestScenario: deleteMock,
  },
}));

import {
  deleteTestScenario,
  getTestScenario,
  listTestScenarios,
  updateTestScenario,
} from "@/mcp/tools/test-scenarios";

const projectId = "11111111-1111-1111-1111-111111111111";
const scenarioId = "22222222-2222-2222-2222-222222222222";
const scenario: TestScenarioResponse = {
  id: scenarioId,
  projectId,
  createdById: "33333333-3333-3333-3333-333333333333",
  title: "Login",
  contentMd: "# Login\n\n  exact ✓\n",
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
      contentMd: "# Exact",
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

      expect(response.isError).toBe(true);
      expect(response.content[0]?.text).toContain(
        `Error ${kind === "validation" ? "updating" : kind === "not-found" ? "fetching" : "deleting"} Test Scenario: ${kind} service failure`,
      );
    },
  );

  it("exposes the four approved names and no creation tuple", () => {
    expect([
      listTestScenarios[0],
      getTestScenario[0],
      updateTestScenario[0],
      deleteTestScenario[0],
    ]).toEqual([
      "list-test-scenarios",
      "get-test-scenario",
      "update-test-scenario",
      "delete-test-scenario",
    ]);
    expect(
      [
        listTestScenarios,
        getTestScenario,
        updateTestScenario,
        deleteTestScenario,
      ].some(([name]) => name === "create-test-scenario"),
    ).toBe(false);
  });
});
