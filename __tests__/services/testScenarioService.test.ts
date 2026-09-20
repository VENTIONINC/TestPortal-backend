// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import type {
  TestScenarioSummary,
  TestScenarioResponse,
} from "@/types/testScenarios";

const projectExistsMock = jest.fn<() => Promise<boolean>>();
const createMock =
  jest.fn<(...args: never[]) => Promise<TestScenarioResponse | null>>();
const listSummariesMock =
  jest.fn<
    (
      ...args: never[]
    ) => Promise<{ scenarios: TestScenarioSummary[]; total: number }>
  >();
const findManySummariesMock =
  jest.fn<(...args: never[]) => Promise<TestScenarioSummary[]>>();
const countMock = jest.fn<(...args: never[]) => Promise<number>>();
const findByIdMock =
  jest.fn<(...args: never[]) => Promise<TestScenarioResponse | null>>();
const updateMock =
  jest.fn<(...args: never[]) => Promise<TestScenarioResponse | null>>();
const appendStepMock =
  jest.fn<(...args: never[]) => Promise<TestScenarioResponse | null>>();
const updateStepMock =
  jest.fn<(...args: never[]) => Promise<TestScenarioResponse | null>>();
const deleteStepMock =
  jest.fn<(...args: never[]) => Promise<TestScenarioResponse | null>>();
const reorderStepsMock = jest.fn<(...args: never[]) => Promise<unknown>>();
const deleteMock = jest.fn<(...args: never[]) => Promise<number>>();

jest.mock("@/models/projectModel", () => ({
  projectModel: { exists: projectExistsMock },
}));
jest.mock("@/models/testScenarioModel", () => ({
  testScenarioModel: {
    create: createMock,
    listSummaries: listSummariesMock,
    findManySummaries: findManySummariesMock,
    count: countMock,
    findById: findByIdMock,
    update: updateMock,
    appendStep: appendStepMock,
    updateStep: updateStepMock,
    deleteStep: deleteStepMock,
    reorderSteps: reorderStepsMock,
    delete: deleteMock,
  },
}));

import { testScenarioService } from "@/services/testScenarioService";
import {
  TestScenarioNotFoundError,
  TestScenarioValidationError,
} from "@/types/testScenarios";

const projectId = "11111111-1111-1111-1111-111111111111";
const scenarioId = "22222222-2222-2222-2222-222222222222";
const stepId = "33333333-3333-3333-3333-333333333333";
const scenario: TestScenarioResponse = {
  id: scenarioId,
  projectId,
  createdById: "44444444-4444-4444-4444-444444444444",
  title: "Login",
  details: null,
  objective: "Verify login",
  preconditions: null,
  testData: null,
  expectedResult: null,
  notes: null,
  steps: [
    { id: stepId, position: 0, action: "Open login", expectedResult: null },
  ],
  contentMd: "# Login\n",
  contentMdHash: "a".repeat(64),
  contentMdFormatVersion: 1,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("testScenarioService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    projectExistsMock.mockResolvedValue(true);
    createMock.mockResolvedValue(scenario);
    listSummariesMock.mockResolvedValue({ scenarios: [], total: 0 });
    findManySummariesMock.mockResolvedValue([]);
    countMock.mockResolvedValue(0);
    findByIdMock.mockResolvedValue(scenario);
    updateMock.mockResolvedValue(scenario);
    appendStepMock.mockResolvedValue(scenario);
    updateStepMock.mockResolvedValue(scenario);
    deleteStepMock.mockResolvedValue(scenario);
    reorderStepsMock.mockResolvedValue({ kind: "success", scenario });
    deleteMock.mockResolvedValue(1);
  });

  it("normalizes structured creation and keeps initial step order", async () => {
    await testScenarioService.createScenario({
      projectId,
      createdById: scenario.createdById,
      title: "  Login  ",
      details: "  Details  ",
      objective: "  Objective  ",
      steps: [{ action: "  Open login  ", expectedResult: "  Form appears  " }],
    });
    expect(createMock).toHaveBeenCalledWith({
      projectId,
      createdById: scenario.createdById,
      title: "Login",
      details: "Details",
      objective: "Objective",
      preconditions: undefined,
      testData: undefined,
      expectedResult: undefined,
      notes: undefined,
      steps: [{ action: "Open login", expectedResult: "Form appears" }],
    });
  });

  it("rejects generated Markdown and invalid creation before persistence", async () => {
    await expect(
      testScenarioService.createScenario({
        projectId,
        createdById: scenario.createdById,
        title: "Login",
        contentMd: "# Client-authored",
      }),
    ).rejects.toBeInstanceOf(TestScenarioValidationError);
    await expect(
      testScenarioService.createScenario({
        projectId,
        createdById: scenario.createdById,
        title: "Login",
        steps: [{ action: "  " }],
      }),
    ).rejects.toBeInstanceOf(TestScenarioValidationError);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("normalizes list filters and defaults sort before persistence", async () => {
    await testScenarioService.listScenarios({
      projectId,
      page: 2,
      limit: 10,
      search: "  login  ",
      createdById: scenario.createdById,
    });

    expect(listSummariesMock).toHaveBeenCalledWith({
      projectId,
      page: 2,
      limit: 10,
      search: "login",
      createdById: scenario.createdById,
      sort: "recently_created",
    });
  });

  it.each([
    { search: 42, message: "search" },
    { createdById: "not-a-uuid", message: "Creator ID" },
    { sort: "unsupported", message: "sort" },
  ])(
    "rejects invalid list option %#",
    async ({ search, createdById, sort, message }) => {
      await expect(
        testScenarioService.listScenarios({
          projectId,
          ...(search !== undefined ? { search: search as never } : {}),
          ...(createdById !== undefined ? { createdById } : {}),
          ...(sort !== undefined ? { sort: sort as never } : {}),
        }),
      ).rejects.toThrow(message);
      expect(listSummariesMock).not.toHaveBeenCalled();
    },
  );

  it("treats blank search as omitted", async () => {
    await testScenarioService.listScenarios({ projectId, search: " \t" });
    expect(listSummariesMock).toHaveBeenCalledWith({
      projectId,
      page: 1,
      limit: 30,
      sort: "recently_created",
    });
  });

  it("clears nullable fields and preserves omitted fields on PATCH", async () => {
    await testScenarioService.updateScenario({
      scenarioId,
      projectId,
      notes: null,
      objective: "  Updated objective  ",
    });
    expect(updateMock).toHaveBeenCalledWith(scenarioId, projectId, {
      notes: null,
      objective: "Updated objective",
    });
  });

  it("rejects empty, unknown, and read-only updates", async () => {
    await expect(
      testScenarioService.updateScenario({ scenarioId, projectId }),
    ).rejects.toBeInstanceOf(TestScenarioValidationError);
    await expect(
      testScenarioService.updateScenario({
        scenarioId,
        projectId,
        contentMd: "# no",
      }),
    ).rejects.toBeInstanceOf(TestScenarioValidationError);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("delegates step mutations and complete-order validation", async () => {
    await testScenarioService.appendStep({
      scenarioId,
      projectId,
      action: "  Submit  ",
    });
    await testScenarioService.updateStep({
      scenarioId,
      projectId,
      stepId,
      expectedResult: null,
    });
    await testScenarioService.deleteStep({ scenarioId, projectId, stepId });
    await testScenarioService.reorderSteps({
      scenarioId,
      projectId,
      stepIds: [stepId],
    });
    expect(appendStepMock).toHaveBeenCalledWith({
      scenarioId,
      projectId,
      action: "Submit",
    });
    expect(updateStepMock).toHaveBeenCalledWith({
      scenarioId,
      projectId,
      stepId,
      expectedResult: null,
    });
    expect(deleteStepMock).toHaveBeenCalledWith({
      scenarioId,
      projectId,
      stepId,
    });
    expect(reorderStepsMock).toHaveBeenCalledWith({
      scenarioId,
      projectId,
      stepIds: [stepId],
    });
  });

  it("maps missing project and scenario to not-found errors", async () => {
    projectExistsMock.mockResolvedValue(false);
    await expect(
      testScenarioService.createScenario({
        projectId,
        createdById: scenario.createdById,
        title: "Login",
      }),
    ).rejects.toBeInstanceOf(TestScenarioNotFoundError);
    updateMock.mockResolvedValue(null);
    await expect(
      testScenarioService.updateScenario({
        scenarioId,
        projectId,
        title: "New",
      }),
    ).rejects.toBeInstanceOf(TestScenarioNotFoundError);
  });
});
