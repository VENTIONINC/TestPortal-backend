// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import type { TestScenario } from "@prisma/client";
import {
  executeController,
} from "@/test-utils/httpMocks";

const createScenarioMock = jest.fn<() => Promise<TestScenario>>();
const listScenariosMock = jest.fn<
  () => Promise<{
    scenarios: TestScenario[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>
>();
const getScenarioByIdMock = jest.fn<() => Promise<TestScenario>>();
const updateScenarioMock = jest.fn<() => Promise<TestScenario>>();
const deleteScenarioMock = jest.fn<() => Promise<void>>();

jest.mock("@/services/testScenarioService", () => ({
  testScenarioService: {
    createScenario: createScenarioMock,
    listScenarios: listScenariosMock,
    getScenarioById: getScenarioByIdMock,
    updateScenario: updateScenarioMock,
    deleteScenario: deleteScenarioMock,
  },
}));

import { testScenarioController } from "@/controllers/testScenarioController";
import {
  TestScenarioNotFoundError,
} from "@/types/testScenarios";

const projectId = "11111111-1111-1111-1111-111111111111";
const scenarioId = "22222222-2222-2222-2222-222222222222";
const scenario: TestScenario = {
  id: scenarioId,
  projectId,
  createdById: "33333333-3333-3333-3333-333333333333",
  title: "Scenario",
  contentMd: "# Exact\n\n  Markdown ✓\n",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};
const authenticatedUser = {
  id: scenario.createdById,
  name: "Scenario Creator",
  email: "creator@example.com",
  status: "active",
  role: "member",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
} as const;

describe("testScenarioController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createScenarioMock.mockResolvedValue(scenario);
    listScenariosMock.mockResolvedValue({
      scenarios: [scenario],
      total: 1,
      page: 1,
      limit: 30,
      totalPages: 1,
    });
    getScenarioByIdMock.mockResolvedValue(scenario);
    updateScenarioMock.mockResolvedValue(scenario);
    deleteScenarioMock.mockResolvedValue(undefined);
  });

  it("creates a scenario with a 201 response and preserves the response body", async () => {
    const response = await executeController(testScenarioController.create, {
      method: "POST",
      user: authenticatedUser,
      body: {
        projectId,
        title: "  Scenario  ",
        contentMd: scenario.contentMd,
        createdById: "99999999-9999-9999-9999-999999999999",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.body).toBe(scenario);
    expect(createScenarioMock).toHaveBeenCalledWith({
      projectId,
      title: "Scenario",
      contentMd: scenario.contentMd,
      createdById: authenticatedUser.id,
    });
  });

  it("requires an authenticated user before creating a scenario", async () => {
    const response = await executeController(testScenarioController.create, {
      method: "POST",
      body: { projectId, title: "Scenario", contentMd: "content" },
    });

    expect(response.statusCode).toBe(401);
    expect(createScenarioMock).not.toHaveBeenCalled();
  });

  it("rejects malformed input with 400 without calling the service", async () => {
    const response = await executeController(testScenarioController.create, {
      method: "POST",
      user: authenticatedUser,
      body: { projectId: "not-a-uuid", title: " ", contentMd: "" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual(expect.objectContaining({ error: expect.any(String) }));
    expect(createScenarioMock).not.toHaveBeenCalled();
  });

  it("maps project not-found and unexpected create errors", async () => {
    createScenarioMock.mockRejectedValueOnce(
      new TestScenarioNotFoundError("Project not found"),
    );
    const notFound = await executeController(testScenarioController.create, {
      method: "POST",
      user: authenticatedUser,
      body: { projectId, title: "Scenario", contentMd: "content" },
    });
    expect(notFound.statusCode).toBe(404);

    createScenarioMock.mockRejectedValueOnce(new Error("database unavailable"));
    const failed = await executeController(testScenarioController.create, {
      method: "POST",
      user: authenticatedUser,
      body: { projectId, title: "Scenario", contentMd: "content" },
    });
    expect(failed.statusCode).toBe(500);
  });

  it("returns the stable default list envelope", async () => {
    const response = await executeController(testScenarioController.list, {
      query: { projectId },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      scenarios: [scenario],
      page: 1,
      limit: 30,
    }));
    expect(listScenariosMock).toHaveBeenCalledWith({
      projectId,
      page: 1,
      limit: 30,
    });
  });

  it("rejects invalid pagination with 400", async () => {
    const response = await executeController(testScenarioController.list, {
      query: { projectId, page: "0", limit: "101" },
    });

    expect(response.statusCode).toBe(400);
    expect(listScenariosMock).not.toHaveBeenCalled();
  });

  it("returns exact Markdown detail data and maps missing records to 404", async () => {
    const response = await executeController(testScenarioController.getById, {
      params: { scenarioId },
      query: { projectId },
    });
    expect(response.statusCode).toBe(200);
    expect((response.body as TestScenario).contentMd).toBe(scenario.contentMd);

    getScenarioByIdMock.mockRejectedValueOnce(
      new TestScenarioNotFoundError("Scenario not found"),
    );
    const missing = await executeController(testScenarioController.getById, {
      params: { scenarioId },
      query: { projectId },
    });
    expect(missing.statusCode).toBe(404);
  });

  it("returns an empty 204 deletion response", async () => {
    const response = await executeController(testScenarioController.delete, {
      method: "DELETE",
      params: { scenarioId },
      query: { projectId },
    });

    expect(response.statusCode).toBe(204);
    expect(response.body).toBeUndefined();
    expect(deleteScenarioMock).toHaveBeenCalledWith(scenarioId, projectId);
  });

  it("updates a scenario with a complete persisted detail response", async () => {
    const updatedScenario = {
      ...scenario,
      title: "Updated title",
      contentMd: "# Updated",
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    };
    updateScenarioMock.mockResolvedValue(updatedScenario);

    const response = await executeController(testScenarioController.update, {
      method: "PATCH",
      params: { scenarioId },
      query: { projectId },
      body: { title: " Updated title ", contentMd: "# Updated" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe(updatedScenario);
    expect(updateScenarioMock).toHaveBeenCalledWith({
      scenarioId,
      projectId,
      title: "Updated title",
      contentMd: "# Updated",
    });
  });

  it("rejects invalid update bodies without changing state", async () => {
    const response = await executeController(testScenarioController.update, {
      method: "PATCH",
      params: { scenarioId },
      query: { projectId },
      body: { title: "Updated", projectId },
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual(expect.objectContaining({ error: expect.any(String) }));
    expect(updateScenarioMock).not.toHaveBeenCalled();
  });

  it("maps update not-found and unexpected errors", async () => {
    updateScenarioMock.mockRejectedValueOnce(
      new TestScenarioNotFoundError("Scenario not found"),
    );
    const notFound = await executeController(testScenarioController.update, {
      method: "PATCH",
      params: { scenarioId },
      query: { projectId },
      body: { contentMd: "# Missing" },
    });
    expect(notFound.statusCode).toBe(404);

    updateScenarioMock.mockRejectedValueOnce(new Error("database unavailable"));
    const failed = await executeController(testScenarioController.update, {
      method: "PATCH",
      params: { scenarioId },
      query: { projectId },
      body: { title: "Updated" },
    });
    expect(failed.statusCode).toBe(500);
  });
});
