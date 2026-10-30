// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import type {
  TestScenarioIssuesResponse,
  TestScenarioResultsResponse,
} from "@/types/testScenarioIntegration";
import type {
  TestScenarioMcpDeleteParams,
  TestScenarioMcpGetParams,
  TestScenarioMcpListParams,
  TestScenarioMcpUpdateParams,
  TestScenarioResponse,
  AppendTestScenarioStepParams,
  UpdateTestScenarioStepParams,
  DeleteTestScenarioStepParams,
  ReorderTestScenarioStepsParams,
  TestScenarioSummaryListResponse,
} from "@/types/testScenarios";

const listSummariesMock =
  jest.fn<
    (
      params: TestScenarioMcpListParams,
    ) => Promise<TestScenarioSummaryListResponse>
  >();
const getScenarioMock =
  jest.fn<
    (scenarioId: string, projectId: string) => Promise<TestScenarioResponse>
  >();
const updateScenarioMock =
  jest.fn<
    (params: TestScenarioMcpUpdateParams) => Promise<TestScenarioResponse>
  >();
const deleteScenarioMock =
  jest.fn<(scenarioId: string, projectId: string) => Promise<void>>();
const appendStepMock =
  jest.fn<(params: AppendTestScenarioStepParams) => Promise<TestScenarioResponse>>();
const updateStepMock =
  jest.fn<(params: UpdateTestScenarioStepParams) => Promise<TestScenarioResponse>>();
const deleteStepMock =
  jest.fn<(params: DeleteTestScenarioStepParams) => Promise<TestScenarioResponse>>();
const reorderStepsMock =
  jest.fn<(params: ReorderTestScenarioStepsParams) => Promise<TestScenarioResponse>>();
const getResultsMock =
  jest.fn<
    (params: {
      scenarioId: string;
      projectId: string;
      page?: number;
      limit?: number;
    }) => Promise<TestScenarioResultsResponse>
  >();
const getIssuesMock =
  jest.fn<
    (params: {
      scenarioId: string;
      projectId: string;
      page?: number;
      limit?: number;
    }) => Promise<TestScenarioIssuesResponse>
  >();

jest.mock("@/services/testScenarioService", () => ({
  testScenarioService: {
    listScenarios: listSummariesMock,
    getScenarioById: getScenarioMock,
    updateScenario: updateScenarioMock,
    deleteScenario: deleteScenarioMock,
    appendStep: appendStepMock,
    updateStep: updateStepMock,
    deleteStep: deleteStepMock,
    reorderSteps: reorderStepsMock,
  },
}));
jest.mock("@/services/testScenarioIntegrationService", () => ({
  testScenarioIntegrationService: {
    getResults: getResultsMock,
    getIssues: getIssuesMock,
  },
}));

import { mcpTestScenarioHandler } from "@/handlers/mcpTestScenarioHandler";

const projectId = "11111111-1111-1111-1111-111111111111";
const scenarioId = "22222222-2222-2222-2222-222222222222";
const scenario: TestScenarioResponse = {
  id: scenarioId,
  projectId,
  createdById: "33333333-3333-3333-3333-333333333333",
  title: "Login",
  scenarioKey: null,
  contentMd: "  # Login\n\n  exact ✓\n",
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
const resultEvidence: TestScenarioResultsResponse = {
  scenarioId,
  projectId,
  linkedSpecCount: 2,
  results: [],
  total: 3,
  page: 2,
  limit: 2,
  totalPages: 2,
};
const issueEvidence: TestScenarioIssuesResponse = {
  scenarioId,
  projectId,
  linkedSpecCount: 2,
  issues: [],
  total: 1,
  page: 3,
  limit: 1,
  totalPages: 1,
};

describe("mcpTestScenarioHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listSummariesMock.mockResolvedValue({
      scenarios: [],
      total: 0,
      page: 1,
      limit: 30,
      totalPages: 0,
    });
    getScenarioMock.mockResolvedValue(scenario);
    updateScenarioMock.mockResolvedValue(scenario);
    deleteScenarioMock.mockResolvedValue(undefined);
    appendStepMock.mockResolvedValue(scenario);
    updateStepMock.mockResolvedValue(scenario);
    deleteStepMock.mockResolvedValue(scenario);
    reorderStepsMock.mockResolvedValue(scenario);
    getResultsMock.mockResolvedValue(resultEvidence);
    getIssuesMock.mockResolvedValue(issueEvidence);
  });

  it("delegates list requests to the shared summary service", async () => {
    const params: TestScenarioMcpListParams = {
      projectId,
      page: 2,
      limit: 10,
    };
    const response = await mcpTestScenarioHandler.listTestScenarios(params);

    expect(response).toEqual({
      scenarios: [],
      total: 0,
      page: 1,
      limit: 30,
      totalPages: 0,
    });
    expect(listSummariesMock).toHaveBeenCalledWith(params);
  });

  it("composes complete detail with independently paginated evidence", async () => {
    const params: TestScenarioMcpGetParams = {
      scenarioId,
      projectId,
      resultPage: 2,
      resultLimit: 2,
      issuePage: 3,
      issueLimit: 1,
    };

    await expect(
      mcpTestScenarioHandler.getTestScenario(params),
    ).resolves.toEqual({
      scenario,
      resultEvidence,
      issueEvidence,
    });

    expect(getScenarioMock).toHaveBeenCalledWith(scenarioId, projectId);
    expect(getResultsMock).toHaveBeenCalledWith({
      scenarioId,
      projectId,
      page: 2,
      limit: 2,
    });
    expect(getIssuesMock).toHaveBeenCalledWith({
      scenarioId,
      projectId,
      page: 3,
      limit: 1,
    });
  });

  it("leaves omitted evidence pagination for the evidence services to default", async () => {
    await mcpTestScenarioHandler.getTestScenario({ scenarioId, projectId });

    expect(getResultsMock).toHaveBeenCalledWith({ scenarioId, projectId });
    expect(getIssuesMock).toHaveBeenCalledWith({ scenarioId, projectId });
  });

  it.each([
    [{ title: "  Updated title  " }, "title-only"],
    [{ contentMd: "\n  # Exact Markdown ✓\n" }, "Markdown-only"],
    [{ details: "  Updated details  " }, "details-only"],
    [{ details: null }, "clear-details"],
    [
      { title: "  Combined  ", contentMd: "# Combined\n\n  exact\n" },
      "combined",
    ],
  ])(
    "delegates %s updates without rewriting authored fields",
    async (
      fields: { title?: string; contentMd?: string; details?: string | null },
      _label: string,
    ) => {
      const params = {
        scenarioId,
        projectId,
        ...fields,
      } as TestScenarioMcpUpdateParams;

      await mcpTestScenarioHandler.updateTestScenario(params);

      expect(updateScenarioMock).toHaveBeenCalledWith(params);
    },
  );

  it("returns an explicit deletion acknowledgement after service success", async () => {
    const params: TestScenarioMcpDeleteParams = { scenarioId, projectId };

    await expect(
      mcpTestScenarioHandler.deleteTestScenario(params),
    ).resolves.toEqual({ scenarioId, projectId, deleted: true });
    expect(deleteScenarioMock).toHaveBeenCalledWith(scenarioId, projectId);
  });

  it("delegates all step operations exactly and preserves omitted fields", async () => {
    const appendParams = { projectId, scenarioId, action: "Open" };
    const updateParams = { projectId, scenarioId, stepId: "44444444-4444-4444-4444-444444444444", action: "Submit" };
    const deleteParams = { projectId, scenarioId, stepId: "44444444-4444-4444-4444-444444444444" };
    const reorderParams = { projectId, scenarioId, stepIds: [deleteParams.stepId] };

    await expect(mcpTestScenarioHandler.appendTestScenarioStep(appendParams)).resolves.toBe(scenario);
    await expect(mcpTestScenarioHandler.updateTestScenarioStep(updateParams)).resolves.toBe(scenario);
    await expect(mcpTestScenarioHandler.deleteTestScenarioStep(deleteParams)).resolves.toBe(scenario);
    await expect(mcpTestScenarioHandler.reorderTestScenarioSteps(reorderParams)).resolves.toBe(scenario);

    expect(appendStepMock).toHaveBeenCalledWith(appendParams);
    expect(updateStepMock).toHaveBeenCalledWith(updateParams);
    expect(deleteStepMock).toHaveBeenCalledWith(deleteParams);
    expect(reorderStepsMock).toHaveBeenCalledWith(reorderParams);
  });

  it("propagates step service failures", async () => {
    const failure = new Error("step service failed");
    appendStepMock.mockRejectedValue(failure);
    await expect(
      mcpTestScenarioHandler.appendTestScenarioStep({ projectId, scenarioId, action: "Open" }),
    ).rejects.toBe(failure);
  });
});
