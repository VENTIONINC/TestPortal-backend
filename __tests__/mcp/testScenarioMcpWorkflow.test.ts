// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import type { MCPToolResponse } from "@/types";
import type { TestScenarioResponse } from "@/types/testScenarios";

const scenarioGetMock = jest.fn<() => Promise<TestScenarioResponse>>();
const scenarioUpdateMock = jest.fn<(...args: never[]) => Promise<TestScenarioResponse>>();
const scenarioDeleteMock = jest.fn<(...args: never[]) => Promise<number>>();
const resultEvidenceMock = jest.fn<(...args: never[]) => Promise<unknown>>();
const issueEvidenceMock = jest.fn<(...args: never[]) => Promise<unknown>>();

jest.mock("@/services/testScenarioService", () => ({
  testScenarioService: {
    getScenarioById: scenarioGetMock,
    updateScenario: scenarioUpdateMock,
    deleteScenario: scenarioDeleteMock,
    listScenarios: jest.fn(),
  },
}));
jest.mock("@/services/testScenarioIntegrationService", () => ({
  testScenarioIntegrationService: {
    getResults: resultEvidenceMock,
    getIssues: issueEvidenceMock,
  },
}));

import { mcpTestScenarioHandler } from "@/handlers/mcpTestScenarioHandler";
import { getTestScenario, updateTestScenario } from "@/mcp/tools/test-scenarios";

const projectId = "11111111-1111-1111-1111-111111111111";
const scenarioId = "22222222-2222-2222-2222-222222222222";
const scenario: TestScenarioResponse = {
  id: scenarioId,
  projectId,
  createdById: "33333333-3333-3333-3333-333333333333",
  title: "Login",
  details: null,
  objective: "Verify login",
  preconditions: null,
  testData: null,
  expectedResult: null,
  notes: null,
  steps: [{ id: "44444444-4444-4444-4444-444444444444", position: 0, action: "Open", expectedResult: null }],
  contentMd: "# Login\n\n## Objective\nVerify login\n\n## Steps\n### Step 1\nOpen\n",
  contentMdHash: "a".repeat(64),
  contentMdFormatVersion: 1,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

async function invoke<T>(handler: (input: T) => Promise<unknown>, input: T) {
  const response = await handler(input) as MCPToolResponse;
  const text = response.content[0];
  let data: unknown;
  if (text?.type === "text") {
    try {
      data = JSON.parse(text.text) as unknown;
    } catch {
      data = undefined;
    }
  }
  return { response, data };
}

describe("Test Scenario MCP workflow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    scenarioGetMock.mockResolvedValue(scenario);
    scenarioUpdateMock.mockResolvedValue(scenario);
    scenarioDeleteMock.mockResolvedValue(1);
    resultEvidenceMock.mockResolvedValue({ scenarioId, projectId, linkedSpecCount: 0, results: [], total: 0, page: 2, limit: 1, totalPages: 0 });
    issueEvidenceMock.mockResolvedValue({ scenarioId, projectId, linkedSpecCount: 0, issues: [], total: 0, page: 1, limit: 2, totalPages: 0 });
  });

  it("returns generated Markdown, structured content, and independent evidence pages", async () => {
    const { data } = await invoke(getTestScenario[3], {
      scenarioId,
      projectId,
      resultPage: 2,
      resultLimit: 1,
      issuePage: 1,
      issueLimit: 2,
    });
    expect(data).toEqual(expect.objectContaining({
      scenario: expect.objectContaining({
        id: scenario.id,
        contentMd: scenario.contentMd,
        steps: scenario.steps,
      }),
      resultEvidence: expect.any(Object),
      issueEvidence: expect.any(Object),
    }));
    expect(resultEvidenceMock).toHaveBeenCalledWith({ scenarioId, projectId, page: 2, limit: 1 });
    expect(issueEvidenceMock).toHaveBeenCalledWith({ scenarioId, projectId, page: 1, limit: 2 });
  });

  it("updates only structured fields through the shared service", async () => {
    const { data } = await invoke(updateTestScenario[3], {
      scenarioId,
      projectId,
      objective: "  New objective  ",
      notes: null,
    });
    expect(data).toEqual(expect.objectContaining({ id: scenario.id, contentMd: scenario.contentMd }));
    expect(scenarioUpdateMock).toHaveBeenCalledWith({
      scenarioId,
      projectId,
      objective: "  New objective  ",
      notes: null,
    });
  });

  it("surfaces shared service errors as MCP errors", async () => {
    scenarioUpdateMock.mockRejectedValueOnce(new Error("wrong project"));
    const { response } = await invoke(updateTestScenario[3], { scenarioId, projectId, title: "No" });
    expect(response.isError).toBe(true);
  });

  it("keeps the handler composition explicit", async () => {
    await mcpTestScenarioHandler.getTestScenario({ scenarioId, projectId });
    expect(scenarioGetMock).toHaveBeenCalledWith(scenarioId, projectId);
    expect(resultEvidenceMock).toHaveBeenCalledWith({ scenarioId, projectId });
    expect(issueEvidenceMock).toHaveBeenCalledWith({ scenarioId, projectId });
  });
});
