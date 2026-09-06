// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { executeController } from "@/test-utils/httpMocks";
import type { TestScenarioResponse } from "@/types/testScenarios";

const createMock = jest.fn<() => Promise<TestScenarioResponse>>();
const listMock = jest.fn<() => Promise<unknown>>();
const getMock = jest.fn<() => Promise<TestScenarioResponse>>();
const updateMock = jest.fn<() => Promise<TestScenarioResponse>>();
const appendStepMock = jest.fn<() => Promise<TestScenarioResponse>>();
const updateStepMock = jest.fn<() => Promise<TestScenarioResponse>>();
const deleteStepMock = jest.fn<() => Promise<TestScenarioResponse>>();
const reorderStepsMock = jest.fn<() => Promise<TestScenarioResponse>>();
const deleteMock = jest.fn<() => Promise<void>>();

jest.mock("@/services/testScenarioService", () => ({
  testScenarioService: {
    createScenario: createMock,
    listScenarios: listMock,
    getScenarioById: getMock,
    updateScenario: updateMock,
    appendStep: appendStepMock,
    updateStep: updateStepMock,
    deleteStep: deleteStepMock,
    reorderSteps: reorderStepsMock,
    deleteScenario: deleteMock,
  },
}));

import { testScenarioController } from "@/controllers/testScenarioController";

const projectId = "11111111-1111-1111-1111-111111111111";
const scenarioId = "22222222-2222-2222-2222-222222222222";
const stepId = "33333333-3333-3333-3333-333333333333";
const userId = "44444444-4444-4444-4444-444444444444";
const user = {
  id: userId,
  name: "Creator",
  email: "creator@example.com",
  status: "active",
  role: "member",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
} as const;
const scenario: TestScenarioResponse = {
  id: scenarioId,
  projectId,
  createdById: userId,
  title: "Login",
  details: null,
  objective: null,
  preconditions: null,
  testData: null,
  expectedResult: null,
  notes: null,
  steps: [{ id: stepId, position: 0, action: "Open", expectedResult: null }],
  contentMd: "# Login\n",
  contentMdHash: "a".repeat(64),
  contentMdFormatVersion: 1,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("testScenarioController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createMock.mockResolvedValue(scenario);
    getMock.mockResolvedValue(scenario);
    updateMock.mockResolvedValue(scenario);
    appendStepMock.mockResolvedValue(scenario);
    updateStepMock.mockResolvedValue(scenario);
    deleteStepMock.mockResolvedValue(scenario);
    reorderStepsMock.mockResolvedValue(scenario);
    deleteMock.mockResolvedValue(undefined);
  });

  it("creates structured scenarios from authenticated context", async () => {
    const response = await executeController(testScenarioController.create, {
      method: "POST",
      user,
      body: {
        projectId,
        title: "  Login  ",
        objective: "  Verify  ",
        steps: [{ action: " Open " }],
      },
    });
    expect(response.statusCode).toBe(201);
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ createdById: userId }));
    expect(response.body).toBe(scenario);
  });

  it("rejects read-only Markdown input", async () => {
    const response = await executeController(testScenarioController.create, {
      method: "POST",
      user,
      body: { projectId, title: "Login", contentMd: "# no" },
    });
    expect(response.statusCode).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("requires project context and wires scenario PATCH", async () => {
    const response = await executeController(testScenarioController.update, {
      method: "PATCH",
      params: { scenarioId },
      query: { projectId },
      body: { notes: null },
    });
    expect(response.statusCode).toBe(200);
    expect(updateMock).toHaveBeenCalledWith({ scenarioId, projectId, notes: null });
  });

  it("wires append, patch, delete, and reorder step routes", async () => {
    await expect(executeController(testScenarioController.appendStep, {
      method: "POST", params: { scenarioId }, query: { projectId }, body: { action: "Run" },
    })).resolves.toEqual(expect.objectContaining({ statusCode: 201 }));
    await expect(executeController(testScenarioController.updateStep, {
      method: "PATCH", params: { scenarioId, stepId }, query: { projectId }, body: { expectedResult: null },
    })).resolves.toEqual(expect.objectContaining({ statusCode: 200 }));
    await expect(executeController(testScenarioController.deleteStep, {
      method: "DELETE", params: { scenarioId, stepId }, query: { projectId },
    })).resolves.toEqual(expect.objectContaining({ statusCode: 200 }));
    await expect(executeController(testScenarioController.reorderSteps, {
      method: "PUT", params: { scenarioId }, query: { projectId }, body: { stepIds: [stepId] },
    })).resolves.toEqual(expect.objectContaining({ statusCode: 200 }));
  });
});
