// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { executeController } from "@/test-utils/httpMocks";
import {
  TestScenarioSpecLinkConflictError,
  TestScenarioSpecLinkNotFoundError,
} from "@/types/testScenarioIntegration";

const addSpecLinkMock = jest.fn<() => Promise<unknown>>();
const listSpecLinksMock = jest.fn<() => Promise<unknown>>();
const removeSpecLinkMock = jest.fn<() => Promise<unknown>>();
const getResultsMock = jest.fn<() => Promise<unknown>>();
const getIssuesMock = jest.fn<() => Promise<unknown>>();

jest.mock("@/services/testScenarioService", () => ({
  testScenarioService: {},
}));
jest.mock("@/services/testScenarioIntegrationService", () => ({
  testScenarioIntegrationService: {
    addSpecLink: addSpecLinkMock,
    listSpecLinks: listSpecLinksMock,
    removeSpecLink: removeSpecLinkMock,
    getResults: getResultsMock,
    getIssues: getIssuesMock,
  },
}));

import { testScenarioController } from "@/controllers/testScenarioController";

const projectId = "11111111-1111-1111-1111-111111111111";
const scenarioId = "22222222-2222-2222-2222-222222222222";
const specId = "33333333-3333-3333-3333-333333333333";

describe("testScenarioController integration operations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    addSpecLinkMock.mockResolvedValue({ scenarioId, specId });
    listSpecLinksMock.mockResolvedValue({
      scenarioId,
      projectId,
      specs: [],
      total: 0,
      page: 1,
      limit: 30,
      totalPages: 0,
    });
    removeSpecLinkMock.mockResolvedValue(undefined);
    getResultsMock.mockResolvedValue({
      scenarioId,
      projectId,
      linkedSpecCount: 0,
      results: [],
      total: 0,
      page: 1,
      limit: 30,
      totalPages: 0,
    });
    getIssuesMock.mockResolvedValue({
      scenarioId,
      projectId,
      linkedSpecCount: 0,
      issues: [],
      total: 0,
      page: 1,
      limit: 30,
      totalPages: 0,
    });
  });

  it("validates and creates a Spec link with 201", async () => {
    const response = await executeController(testScenarioController.addSpecLink, {
      method: "POST",
      params: { scenarioId },
      query: { projectId },
      body: { specId },
    });

    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual({ scenarioId, specId });
    expect(addSpecLinkMock).toHaveBeenCalledWith({
      scenarioId,
      projectId,
      specId,
    });
  });

  it("rejects malformed link input with 400 before calling the service", async () => {
    const response = await executeController(testScenarioController.addSpecLink, {
      params: { scenarioId: "bad" },
      query: { projectId },
      body: { specId },
    });

    expect(response.statusCode).toBe(400);
    expect(addSpecLinkMock).not.toHaveBeenCalled();
  });

  it("returns the default linked-Spec page", async () => {
    const response = await executeController(testScenarioController.listSpecLinks, {
      params: { scenarioId },
      query: { projectId },
    });

    expect(response.statusCode).toBe(200);
    expect(listSpecLinksMock).toHaveBeenCalledWith({
      scenarioId,
      projectId,
      page: 1,
      limit: 30,
    });
  });

  it("maps removal success to an empty 204 and typed misses to 404", async () => {
    const response = await executeController(testScenarioController.removeSpecLink, {
      method: "DELETE",
      params: { scenarioId, specId },
      query: { projectId },
    });
    expect(response.statusCode).toBe(204);
    expect(response.body).toBeUndefined();

    removeSpecLinkMock.mockRejectedValueOnce(
      new TestScenarioSpecLinkNotFoundError("Link not found"),
    );
    const missing = await executeController(testScenarioController.removeSpecLink, {
      method: "DELETE",
      params: { scenarioId, specId },
      query: { projectId },
    });
    expect(missing.statusCode).toBe(404);
  });

  it("returns independently paginated Result and Issue envelopes", async () => {
    const resultResponse = await executeController(testScenarioController.getResults, {
      params: { scenarioId },
      query: { projectId, page: "2", limit: "5" },
    });
    const issueResponse = await executeController(testScenarioController.getIssues, {
      params: { scenarioId },
      query: { projectId, page: "2", limit: "5" },
    });

    expect(resultResponse.statusCode).toBe(200);
    expect(issueResponse.statusCode).toBe(200);
    expect(getResultsMock).toHaveBeenCalledWith({
      scenarioId,
      projectId,
      page: 2,
      limit: 5,
    });
    expect(getIssuesMock).toHaveBeenCalledWith({
      scenarioId,
      projectId,
      page: 2,
      limit: 5,
    });
  });

  it("maps duplicate and unexpected service errors without message inspection", async () => {
    addSpecLinkMock.mockRejectedValueOnce(
      new TestScenarioSpecLinkConflictError("already linked"),
    );
    const conflict = await executeController(testScenarioController.addSpecLink, {
      method: "POST",
      params: { scenarioId },
      query: { projectId },
      body: { specId },
    });
    expect(conflict.statusCode).toBe(409);

    getIssuesMock.mockRejectedValueOnce(new Error("database unavailable"));
    const failed = await executeController(testScenarioController.getIssues, {
      params: { scenarioId },
      query: { projectId },
    });
    expect(failed.statusCode).toBe(500);
  });

  it("rejects evidence pagination above the contract limit", async () => {
    const response = await executeController(testScenarioController.getResults, {
      params: { scenarioId },
      query: { projectId, page: "1", limit: "101" },
    });

    expect(response.statusCode).toBe(400);
    expect(getResultsMock).not.toHaveBeenCalled();
  });
});
