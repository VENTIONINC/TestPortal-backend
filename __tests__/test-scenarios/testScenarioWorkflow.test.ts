// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { executeController } from "@/test-utils/httpMocks";
import type { TestScenarioResponse } from "@/types/testScenarios";

const projectExistsMock = jest.fn<() => Promise<boolean>>();
const createMock = jest.fn<(...args: never[]) => Promise<TestScenarioResponse | null>>();
const findByIdMock = jest.fn<(...args: never[]) => Promise<TestScenarioResponse | null>>();
const updateMock = jest.fn<(...args: never[]) => Promise<TestScenarioResponse | null>>();
const deleteMock = jest.fn<(...args: never[]) => Promise<number>>();
const listMock = jest.fn<(...args: never[]) => Promise<unknown>>();

jest.mock("@/models/projectModel", () => ({ projectModel: { exists: projectExistsMock } }));
jest.mock("@/models/testScenarioModel", () => ({
  testScenarioModel: {
    create: createMock,
    findById: findByIdMock,
    update: updateMock,
    delete: deleteMock,
    findManySummaries: listMock,
    count: jest.fn(),
  },
}));

import { testScenarioController } from "@/controllers/testScenarioController";

const projectA = "11111111-1111-1111-1111-111111111111";
const projectB = "22222222-2222-2222-2222-222222222222";
const scenarioId = "33333333-3333-3333-3333-333333333333";
const userId = "44444444-4444-4444-4444-444444444444";
const scenario: TestScenarioResponse = {
  id: scenarioId,
  projectId: projectA,
  createdById: userId,
  title: "Login",
  details: null,
  objective: "Verify login",
  preconditions: null,
  testData: null,
  expectedResult: null,
  notes: null,
  steps: [],
  contentMd: "# Login\n\n## Objective\nVerify login\n\n## Steps\n_No steps defined._\n",
  contentMdHash: "a".repeat(64),
  contentMdFormatVersion: 1,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};
const user = {
  id: userId,
  name: "Creator",
  email: "creator@example.com",
  status: "active",
  role: "member",
  createdAt: scenario.createdAt,
  updatedAt: scenario.updatedAt,
} as const;

describe("structured Test Scenario project workflow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    projectExistsMock.mockResolvedValue(true);
    createMock.mockResolvedValue(scenario);
    findByIdMock.mockImplementation(async (id: string, projectId: string) => id === scenario.id && projectId === scenario.projectId ? scenario : null);
    updateMock.mockResolvedValue(scenario);
    deleteMock.mockResolvedValue(1);
  });

  it("creates and reads complete structured detail while isolating project context", async () => {
    const created = await executeController(testScenarioController.create, {
      method: "POST",
      user,
      body: { projectId: projectA, title: " Login ", objective: " Verify " },
    });
    expect(created.statusCode).toBe(201);
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ createdById: userId, title: "Login", objective: "Verify" }));

    const wrongProject = await executeController(testScenarioController.getById, {
      params: { scenarioId },
      query: { projectId: projectB },
    });
    expect(wrongProject.statusCode).toBe(404);
    expect(wrongProject.body).toEqual(expect.objectContaining({ error: expect.any(String) }));
  });

  it("rejects raw Markdown on create and patch", async () => {
    const createResponse = await executeController(testScenarioController.create, {
      method: "POST",
      user,
      body: { projectId: projectA, title: "Login", contentMd: "# forbidden" },
    });
    const updateResponse = await executeController(testScenarioController.update, {
      method: "PATCH",
      params: { scenarioId },
      query: { projectId: projectA },
      body: { contentMd: "# forbidden" },
    });
    expect(createResponse.statusCode).toBe(400);
    expect(updateResponse.statusCode).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });
});
