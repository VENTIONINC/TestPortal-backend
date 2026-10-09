// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import {
  TestScenarioNotFoundError,
} from "@/types/testScenarios";
import {
  TestScenarioSpecLinkConflictError,
  TestScenarioSpecLinkNotFoundError,
} from "@/types/testScenarioIntegration";

const scenarioFindByIdMock = jest.fn<() => Promise<unknown>>();
const specFindByIdMock = jest.fn<() => Promise<unknown>>();
const linkCreateMock = jest.fn<() => Promise<unknown>>();
const linkFindLinkedSpecsMock = jest.fn<() => Promise<unknown>>();
const linkCountMock = jest.fn<() => Promise<unknown>>();
const linkFindIdsMock = jest.fn<() => Promise<unknown>>();
const linkDeleteMock = jest.fn<() => Promise<unknown>>();
const resultEvidenceMock = jest.fn<() => Promise<unknown>>();
const issueEvidenceMock = jest.fn<() => Promise<unknown>>();

jest.mock("@/models/testScenarioModel", () => ({
  testScenarioModel: { findById: scenarioFindByIdMock },
}));
jest.mock("@/models/specModel", () => ({
  specModel: { findById: specFindByIdMock },
}));
jest.mock("@/models/testScenarioSpecLinkModel", () => ({
  testScenarioSpecLinkModel: {
    create: linkCreateMock,
    findLinkedSpecs: linkFindLinkedSpecsMock,
    countLinkedSpecs: linkCountMock,
    findLinkedSpecIds: linkFindIdsMock,
    delete: linkDeleteMock,
  },
}));
jest.mock("@/services/resultService", () => ({
  resultService: { getResultsBySpecRecordIds: resultEvidenceMock },
}));
jest.mock("@/services/issueService", () => ({
  issueService: { getObservedIssuesBySpecRecordIds: issueEvidenceMock },
}));

import { testScenarioIntegrationService } from "@/services/testScenarioIntegrationService";

const projectId = "11111111-1111-1111-1111-111111111111";
const scenarioId = "22222222-2222-2222-2222-222222222222";
const specId = "33333333-3333-3333-3333-333333333333";
const scenario = {
  id: scenarioId,
  projectId,
  createdById: "44444444-4444-4444-4444-444444444444",
  title: "Scenario",
  contentMd: "# Scenario",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};
const spec = {
  id: specId,
  projectId,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  key: "spec-1",
  file: "login.spec.ts",
  title: "Login",
  tags: ["smoke"],
  annotations: [],
};

describe("testScenarioIntegrationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    scenarioFindByIdMock.mockResolvedValue(scenario);
    specFindByIdMock.mockResolvedValue(spec);
    linkCreateMock.mockResolvedValue({ testScenarioId: scenarioId, specId });
    linkFindLinkedSpecsMock.mockResolvedValue([{ spec }]);
    linkCountMock.mockResolvedValue(1);
    linkFindIdsMock.mockResolvedValue([specId]);
    linkDeleteMock.mockResolvedValue(1);
    resultEvidenceMock.mockResolvedValue({ results: [], total: 0 });
    issueEvidenceMock.mockResolvedValue({ issues: [], total: 0 });
  });

  it("validates both endpoints in one project before creating a link", async () => {
    await expect(
      testScenarioIntegrationService.addSpecLink({
        scenarioId,
        specId,
        projectId,
      }),
    ).resolves.toEqual({ scenarioId, specId });

    expect(scenarioFindByIdMock).toHaveBeenCalledWith(scenarioId, projectId);
    expect(specFindByIdMock).toHaveBeenCalledWith(specId, projectId);
    expect(linkCreateMock).toHaveBeenCalledWith({
      testScenarioId: scenarioId,
      specId,
    });
  });

  it("maps a database uniqueness race to the typed conflict error", async () => {
    linkCreateMock.mockRejectedValue({ code: "P2002" });

    await expect(
      testScenarioIntegrationService.addSpecLink({
        scenarioId,
        specId,
        projectId,
      }),
    ).rejects.toBeInstanceOf(TestScenarioSpecLinkConflictError);
  });

  it("rejects cross-project links before persistence", async () => {
    specFindByIdMock.mockResolvedValue(null);

    await expect(
      testScenarioIntegrationService.addSpecLink({
        scenarioId,
        specId,
        projectId,
      }),
    ).rejects.toBeInstanceOf(TestScenarioSpecLinkNotFoundError);
    expect(linkCreateMock).not.toHaveBeenCalled();
    expect(specFindByIdMock).toHaveBeenCalledWith(specId, projectId);
  });

  it("lists normalized Specs with stable pagination metadata", async () => {
    const result = await testScenarioIntegrationService.listSpecLinks({
      scenarioId,
      projectId,
      page: 2,
      limit: 1,
    });

    expect(result).toEqual({
      scenarioId,
      projectId,
      specs: [{ ...spec, tags: ["smoke"], annotations: [] }],
      total: 1,
      page: 2,
      limit: 1,
      totalPages: 1,
    });
    expect(linkFindLinkedSpecsMock).toHaveBeenCalledWith(
      scenarioId,
      projectId,
      2,
      1,
    );
  });

  it("removes only an existing link and reports missing links as not found", async () => {
    await expect(
      testScenarioIntegrationService.removeSpecLink({
        scenarioId,
        specId,
        projectId,
      }),
    ).resolves.toBeUndefined();
    expect(linkDeleteMock).toHaveBeenCalledWith(scenarioId, specId);

    linkDeleteMock.mockResolvedValue(0);
    await expect(
      testScenarioIntegrationService.removeSpecLink({
        scenarioId,
        specId,
        projectId,
      }),
    ).rejects.toBeInstanceOf(TestScenarioSpecLinkNotFoundError);
  });

  it("aggregates independently paginated Result evidence across linked Specs", async () => {
    resultEvidenceMock.mockResolvedValue({ results: [{ id: "result-1" }], total: 3 });

    const result = await testScenarioIntegrationService.getResults({
      scenarioId,
      projectId,
      page: 2,
      limit: 2,
    });

    expect(result).toEqual({
      scenarioId,
      projectId,
      linkedSpecCount: 1,
      results: [{ id: "result-1" }],
      total: 3,
      page: 2,
      limit: 2,
      totalPages: 2,
    });
    expect(resultEvidenceMock).toHaveBeenCalledWith({
      projectId,
      specRecordIds: [specId],
      page: 2,
      limit: 2,
    });
  });

  it("returns a valid empty Issue envelope for unlinked scenarios", async () => {
    linkFindIdsMock.mockResolvedValue([]);
    linkCountMock.mockResolvedValue(0);

    await expect(
      testScenarioIntegrationService.getIssues({ scenarioId, projectId }),
    ).resolves.toEqual({
      scenarioId,
      projectId,
      linkedSpecCount: 0,
      issues: [],
      total: 0,
      page: 1,
      limit: 30,
      totalPages: 0,
    });
    expect(issueEvidenceMock).toHaveBeenCalledWith({
      projectId,
      specRecordIds: [],
      page: 1,
      limit: 30,
    });
  });

  it("returns 404 semantics for an unknown scenario context", async () => {
    scenarioFindByIdMock.mockResolvedValue(null);

    await expect(
      testScenarioIntegrationService.getResults({ scenarioId, projectId }),
    ).rejects.toBeInstanceOf(TestScenarioNotFoundError);
    expect(linkFindIdsMock).not.toHaveBeenCalled();
  });
});
