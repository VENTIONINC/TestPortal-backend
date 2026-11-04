// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import type { MCPToolResponse } from "@/types";
import type { TestScenarioResponse } from "@/types/testScenarios";

const scenarioGetMock = jest.fn<() => Promise<TestScenarioResponse>>();
const scenarioUpdateMock =
  jest.fn<(...args: never[]) => Promise<TestScenarioResponse>>();
const scenarioDeleteMock = jest.fn<(...args: never[]) => Promise<number>>();
const scenarioAppendStepMock = jest.fn<(...args: never[]) => Promise<TestScenarioResponse>>();
const scenarioUpdateStepMock = jest.fn<(...args: never[]) => Promise<TestScenarioResponse>>();
const scenarioDeleteStepMock = jest.fn<(...args: never[]) => Promise<TestScenarioResponse>>();
const scenarioReorderStepsMock = jest.fn<(...args: never[]) => Promise<TestScenarioResponse>>();
const resultEvidenceMock = jest.fn<(...args: never[]) => Promise<unknown>>();
const issueEvidenceMock = jest.fn<(...args: never[]) => Promise<unknown>>();

jest.mock("@/services/testScenarioService", () => ({
  testScenarioService: {
    getScenarioById: scenarioGetMock,
    updateScenario: scenarioUpdateMock,
    deleteScenario: scenarioDeleteMock,
    appendStep: scenarioAppendStepMock,
    updateStep: scenarioUpdateStepMock,
    deleteStep: scenarioDeleteStepMock,
    reorderSteps: scenarioReorderStepsMock,
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
import {
  appendTestScenarioStep,
  deleteTestScenarioStep,
  getTestScenario,
  reorderTestScenarioSteps,
  updateTestScenario,
  updateTestScenarioStep,
} from "@/mcp/tools/test-scenarios";

const projectId = "11111111-1111-1111-1111-111111111111";
const scenarioId = "22222222-2222-2222-2222-222222222222";
const scenario: TestScenarioResponse = {
  id: scenarioId,
  projectId,
  createdById: "33333333-3333-3333-3333-333333333333",
  title: "Login",
  scenarioKey: null,
  details: null,
  preconditions: null,
  testData: null,
  priority: null,
  relatedIssueUrl: null,
  steps: [
    {
      id: "44444444-4444-4444-4444-444444444444",
      position: 0,
      action: "Open",
      expectedResult: null,
    },
  ],
  contentMd:
    "# Login\n\n## Objective\nVerify login\n\n## Steps\n### Step 1\nOpen\n",
  contentMdHash: "a".repeat(64),
  contentMdFormatVersion: 1,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};
let currentScenario: TestScenarioResponse = scenario;

async function invoke<T>(handler: (input: T) => Promise<unknown>, input: T) {
  const response = (await handler(input)) as MCPToolResponse;
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
    currentScenario = scenario;
    scenarioGetMock.mockImplementation(async () => currentScenario);
    scenarioUpdateMock.mockResolvedValue(scenario);
    scenarioDeleteMock.mockResolvedValue(1);
    scenarioAppendStepMock.mockImplementation(async (params) => {
      const input = params as unknown as { action: string; expectedResult?: string };
      currentScenario = {
        ...currentScenario,
        steps: [...currentScenario.steps, {
          id: "55555555-5555-4555-8555-555555555555",
          position: currentScenario.steps.length,
          action: input.action.trim(),
          expectedResult: input.expectedResult?.trim() ?? null,
        }],
      };
      return currentScenario;
    });
    scenarioUpdateStepMock.mockImplementation(async (params) => {
      const input = params as unknown as {
        stepId: string; action?: string; expectedResult?: string | null;
      };
      currentScenario = {
        ...currentScenario,
        steps: currentScenario.steps.map((step) => step.id === input.stepId
          ? { ...step, ...(input.action !== undefined ? { action: input.action } : {}), ...(Object.hasOwn(input, "expectedResult") ? { expectedResult: input.expectedResult ?? null } : {}) }
          : step),
      };
      return currentScenario;
    });
    scenarioReorderStepsMock.mockImplementation(async (params) => {
      const ids = (params as unknown as { stepIds: string[] }).stepIds;
      currentScenario = {
        ...currentScenario,
        steps: ids.map((id, position) => {
          const step = currentScenario.steps.find((candidate) => candidate.id === id);
          if (!step) throw new Error(`Unknown step ${id}`);
          return { ...step, position };
        }),
      };
      return currentScenario;
    });
    scenarioDeleteStepMock.mockImplementation(async (params) => {
      const id = (params as unknown as { stepId: string }).stepId;
      currentScenario = {
        ...currentScenario,
        steps: currentScenario.steps.filter((step) => step.id !== id).map((step, position) => ({ ...step, position })),
      };
      return currentScenario;
    });
    resultEvidenceMock.mockResolvedValue({
      scenarioId,
      projectId,
      linkedSpecCount: 0,
      results: [],
      total: 0,
      page: 2,
      limit: 1,
      totalPages: 0,
    });
    issueEvidenceMock.mockResolvedValue({
      scenarioId,
      projectId,
      linkedSpecCount: 0,
      issues: [],
      total: 0,
      page: 1,
      limit: 2,
      totalPages: 0,
    });
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
    expect(data).toEqual(
      expect.objectContaining({
        scenario: expect.objectContaining({
          id: scenario.id,
          contentMd: scenario.contentMd,
          steps: scenario.steps,
        }),
        resultEvidence: expect.any(Object),
        issueEvidence: expect.any(Object),
      }),
    );
    expect(resultEvidenceMock).toHaveBeenCalledWith({
      scenarioId,
      projectId,
      page: 2,
      limit: 1,
    });
    expect(issueEvidenceMock).toHaveBeenCalledWith({
      scenarioId,
      projectId,
      page: 1,
      limit: 2,
    });
  });

  it("updates only structured fields through the shared service", async () => {
    const { data } = await invoke(updateTestScenario[3], {
      scenarioId,
      projectId,
      preconditions: "  New objective  ",
      priority: null,
      relatedIssueUrl: null,
      scenarioKey: "R2",
    });
    expect(data).toEqual(
      expect.objectContaining({
        id: scenario.id,
        contentMd: scenario.contentMd,
      }),
    );
    expect(scenarioUpdateMock).toHaveBeenCalledWith({
      scenarioId,
      projectId,
      preconditions: "  New objective  ",
      priority: null,
      relatedIssueUrl: null,
      scenarioKey: "R2",
    });
  });

  it("forwards a key-only edit through the existing MCP update tool", async () => {
    await invoke(updateTestScenario[3], {
      scenarioId,
      projectId,
      scenarioKey: "R3",
    });
    expect(scenarioUpdateMock).toHaveBeenCalledWith({
      scenarioId,
      projectId,
      scenarioKey: "R3",
    });
  });

  it("surfaces shared service errors as MCP errors", async () => {
    scenarioUpdateMock.mockRejectedValueOnce(new Error("wrong project"));
    const { response } = await invoke(updateTestScenario[3], {
      scenarioId,
      projectId,
      title: "No",
    });
    expect(response.isError).toBe(true);
  });

  it("keeps the handler composition explicit", async () => {
    await mcpTestScenarioHandler.getTestScenario({ scenarioId, projectId });
    expect(scenarioGetMock).toHaveBeenCalledWith(scenarioId, projectId);
    expect(resultEvidenceMock).toHaveBeenCalledWith({ scenarioId, projectId });
    expect(issueEvidenceMock).toHaveBeenCalledWith({ scenarioId, projectId });
  });

  it("completes a step lifecycle with stable IDs and preserved omitted fields", async () => {
    const firstStep = scenario.steps[0];
    if (!firstStep) throw new Error("Expected initial scenario step");
    const firstStepId = firstStep.id;
    const appendedStepId = "55555555-5555-4555-8555-555555555555";
    const appended = await invoke(appendTestScenarioStep[3], {
      projectId, scenarioId, action: "  Submit  ", expectedResult: "  Confirmation shown  ",
    });
    expect(appended.data).toMatchObject({
      steps: [
        { id: firstStepId, action: "Open" },
        { id: appendedStepId, position: 1, action: "Submit", expectedResult: "Confirmation shown" },
      ],
    });
    await invoke(updateTestScenarioStep[3], { projectId, scenarioId, stepId: firstStepId, action: "Visit login" });
    expect(currentScenario.steps[0]).toMatchObject({ id: firstStepId, expectedResult: null, action: "Visit login" });
    await invoke(updateTestScenarioStep[3], { projectId, scenarioId, stepId: appendedStepId, expectedResult: null });
    expect(currentScenario.steps[1]).toMatchObject({ id: appendedStepId, action: "Submit", expectedResult: null });
    await invoke(reorderTestScenarioSteps[3], { projectId, scenarioId, stepIds: [appendedStepId, firstStepId] });
    expect(currentScenario.steps.map(({ id }) => id)).toEqual([appendedStepId, firstStepId]);
    const deleted = await invoke(deleteTestScenarioStep[3], { projectId, scenarioId, stepId: appendedStepId });
    expect(deleted.data).toMatchObject({ steps: [{ id: firstStepId, position: 0, action: "Visit login" }] });
    const final = await invoke(getTestScenario[3], { projectId, scenarioId });
    expect(final.data).toMatchObject({ scenario: { steps: [{ id: firstStepId, position: 0 }] } });
  });

  it("returns standard MCP errors for wrong project and stale step membership", async () => {
    scenarioAppendStepMock.mockRejectedValueOnce(new Error("Scenario not found"));
    const wrongProject = await invoke(appendTestScenarioStep[3], {
      projectId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", scenarioId, action: "Open",
    });
    expect(wrongProject.response.isError).toBe(true);
    scenarioUpdateStepMock.mockRejectedValueOnce(new Error("Step not found"));
    const foreignStep = await invoke(updateTestScenarioStep[3], {
      projectId,
      scenarioId,
      stepId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      action: "Do not leak foreign step",
    });
    expect(foreignStep.response.isError).toBe(true);
    scenarioReorderStepsMock.mockRejectedValueOnce(new Error("stepIds must contain every current step exactly once"));
    const staleOrder = await invoke(reorderTestScenarioSteps[3], { projectId, scenarioId, stepIds: [] });
    expect(staleOrder.response.isError).toBe(true);
  });
});
