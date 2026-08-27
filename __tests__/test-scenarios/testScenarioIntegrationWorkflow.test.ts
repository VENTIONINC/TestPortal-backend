// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";

interface ScenarioRecord {
  id: string;
  projectId: string;
}

interface SpecRecord {
  id: string;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
  key: string;
  file: string;
  title: string;
  tags: string[];
  annotations: unknown[];
}

interface LinkRecord {
  testScenarioId: string;
  specId: string;
}

const projectA = "11111111-1111-1111-1111-111111111111";
const scenarioA = "33333333-3333-3333-3333-333333333333";
const scenarioB = "44444444-4444-4444-4444-444444444444";
const specA = "55555555-5555-5555-5555-555555555555";
const specB = "66666666-6666-6666-6666-666666666666";

const scenarios: ScenarioRecord[] = [
  { id: scenarioA, projectId: projectA },
  { id: scenarioB, projectId: projectA },
];
const specs: SpecRecord[] = [
  {
    id: specA,
    projectId: projectA,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    key: "spec-a",
    file: "a.spec.ts",
    title: "A",
    tags: [],
    annotations: [],
  },
  {
    id: specB,
    projectId: projectA,
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    key: "spec-b",
    file: "b.spec.ts",
    title: "B",
    tags: [],
    annotations: [],
  },
];
const links: LinkRecord[] = [];
const resultEvidence = [
  { id: "result-a", specId: specA, startTime: new Date("2026-01-01T00:00:00.000Z") },
  { id: "result-b", specId: specB, startTime: new Date("2026-01-02T00:00:00.000Z") },
];
const resultErrors = [
  { id: "error-a", resultId: "result-a" },
  { id: "error-b", resultId: "result-b" },
];
const assumptions = [
  { id: "assumption-a", resultErrorId: "error-a", issueId: "issue-shared" },
  { id: "assumption-b", resultErrorId: "error-b", issueId: "issue-b" },
];
const issueEvidence = [
  { id: "issue-shared", specIds: [specA, specB], createdAt: new Date("2026-01-01T00:00:00.000Z") },
  { id: "issue-b", specIds: [specB], createdAt: new Date("2026-01-03T00:00:00.000Z") },
];

const scenarioFindByIdMock = jest.fn<
  (id: string, projectId: string) => Promise<ScenarioRecord | null>
>();
const scenarioDeleteMock = jest.fn<
  (id: string, projectId: string) => Promise<number>
>();
const scenarioUpdateMock = jest.fn<
  (
    id: string,
    projectId: string,
    data: { title?: string; contentMd?: string },
  ) => Promise<ScenarioRecord | null>
>();
const specFindByIdMock = jest.fn<
  (id: string, projectId: string) => Promise<SpecRecord | null>
>();
const specDeleteMock = jest.fn<(id: string, projectId: string) => Promise<void>>();
const linkCreateMock = jest.fn<
  (data: LinkRecord) => Promise<LinkRecord>
>();
const linkFindSpecsMock = jest.fn<
  (scenarioId: string, projectId: string, page?: number, limit?: number) =>
    Promise<Array<{ spec: SpecRecord }>>
>();
const linkCountMock = jest.fn<
  (scenarioId: string, projectId: string) => Promise<number>
>();
const linkFindIdsMock = jest.fn<
  (scenarioId: string, projectId: string) => Promise<string[]>
>();
const linkDeleteMock = jest.fn<
  (scenarioId: string, specId: string) => Promise<number>
>();
const resultEvidenceMock = jest.fn<
  (params: {
    projectId: string;
    specRecordIds: string[];
    page: number;
    limit: number;
  }) => Promise<{ results: Array<{ id: string; specId: string; startTime: Date }>; total: number }>
>();
const issueEvidenceMock = jest.fn<
  (params: {
    projectId: string;
    specRecordIds: string[];
    page: number;
    limit: number;
  }) => Promise<{ issues: Array<{ id: string; specIds: string[]; createdAt: Date }>; total: number }>
>();

jest.mock("@/models/projectModel", () => ({
  projectModel: {
    exists: jest.fn(() => Promise.resolve(true)),
  },
}));
jest.mock("@/models/testScenarioModel", () => ({
  testScenarioModel: {
    findById: scenarioFindByIdMock,
    update: scenarioUpdateMock,
    delete: scenarioDeleteMock,
  },
}));
jest.mock("@/models/specModel", () => ({
  specModel: {
    findById: specFindByIdMock,
    delete: specDeleteMock,
  },
}));
jest.mock("@/models/testScenarioSpecLinkModel", () => ({
  testScenarioSpecLinkModel: {
    create: linkCreateMock,
    findLinkedSpecs: linkFindSpecsMock,
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

import { specService } from "@/services/specService";
import { testScenarioService } from "@/services/testScenarioService";
import { testScenarioIntegrationService } from "@/services/testScenarioIntegrationService";

describe("test scenario execution evidence workflow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    links.length = 0;
    if (!scenarios.some((scenario) => scenario.id === scenarioA)) {
      scenarios.push({ id: scenarioA, projectId: projectA });
    }
    if (!scenarios.some((scenario) => scenario.id === scenarioB)) {
      scenarios.push({ id: scenarioB, projectId: projectA });
    }
    if (!specs.some((spec) => spec.id === specA)) {
      specs.push({
        id: specA,
        projectId: projectA,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        key: "spec-a",
        file: "a.spec.ts",
        title: "A",
        tags: [],
        annotations: [],
      });
    }
    if (!specs.some((spec) => spec.id === specB)) {
      specs.push({
        id: specB,
        projectId: projectA,
        createdAt: new Date("2026-01-02T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
        key: "spec-b",
        file: "b.spec.ts",
        title: "B",
        tags: [],
        annotations: [],
      });
    }
    scenarios.sort((left, right) => left.id.localeCompare(right.id));
    specs.sort((left, right) => left.id.localeCompare(right.id));
    scenarioFindByIdMock.mockImplementation(async (id, projectId) =>
      scenarios.find((scenario) => scenario.id === id && scenario.projectId === projectId) ?? null,
    );
    scenarioUpdateMock.mockImplementation(async (id, projectId) =>
      scenarios.find((scenario) => scenario.id === id && scenario.projectId === projectId) ?? null,
    );
    scenarioDeleteMock.mockImplementation(async (id, projectId) => {
      const index = scenarios.findIndex(
        (scenario) => scenario.id === id && scenario.projectId === projectId,
      );
      if (index === -1) return 0;
      scenarios.splice(index, 1);
      links.splice(0, links.length, ...links.filter((link) => link.testScenarioId !== id));
      return 1;
    });
    specFindByIdMock.mockImplementation(async (id, projectId) =>
      specs.find((spec) => spec.id === id && spec.projectId === projectId) ?? null,
    );
    specDeleteMock.mockImplementation(async (id, projectId) => {
      const index = specs.findIndex(
        (spec) => spec.id === id && spec.projectId === projectId,
      );
      if (index === -1) throw new Error(`Spec with ID ${id} not found`);
      specs.splice(index, 1);
      links.splice(0, links.length, ...links.filter((link) => link.specId !== id));
    });
    linkCreateMock.mockImplementation(async (data) => {
      if (links.some((link) => link.testScenarioId === data.testScenarioId && link.specId === data.specId)) {
        throw { code: "P2002" } as unknown;
      }
      links.push(data);
      return data;
    });
    linkFindSpecsMock.mockImplementation(async (scenarioId: string, projectId: string, page = 1, limit = 30) => {
      const matching = links
        .filter((link) => link.testScenarioId === scenarioId)
        .map((link) => ({ spec: specs.find((spec) => spec.id === link.specId) }))
        .filter((link): link is { spec: SpecRecord } => link.spec?.projectId === projectId)
        .sort((left, right) => right.spec.createdAt.getTime() - left.spec.createdAt.getTime());
      return matching.slice((page - 1) * limit, page * limit);
    });
    linkCountMock.mockImplementation(async (scenarioId: string, projectId: string) =>
      links.filter((link) => link.testScenarioId === scenarioId && specs.some((spec) => spec.id === link.specId && spec.projectId === projectId)).length,
    );
    linkFindIdsMock.mockImplementation(async (scenarioId: string, projectId: string) =>
      links
        .filter((link) => link.testScenarioId === scenarioId && specs.some((spec) => spec.id === link.specId && spec.projectId === projectId))
        .map((link) => link.specId),
    );
    linkDeleteMock.mockImplementation(async (scenarioId: string, specId: string) => {
      const index = links.findIndex((link) => link.testScenarioId === scenarioId && link.specId === specId);
      if (index === -1) return 0;
      links.splice(index, 1);
      return 1;
    });
    resultEvidenceMock.mockImplementation(async ({ projectId, specRecordIds, page, limit }: { projectId: string; specRecordIds: string[]; page: number; limit: number }) => {
      const matching = resultEvidence.filter((result) => specRecordIds.includes(result.specId) && specs.some((spec) => spec.id === result.specId && spec.projectId === projectId));
      const sorted = [...matching].sort((left, right) => right.startTime.getTime() - left.startTime.getTime() || right.id.localeCompare(left.id));
      return { results: sorted.slice((page - 1) * limit, page * limit), total: sorted.length };
    });
    issueEvidenceMock.mockImplementation(async ({ projectId, specRecordIds, page, limit }: { projectId: string; specRecordIds: string[]; page: number; limit: number }) => {
      const matching = issueEvidence.filter((issue) => issue.specIds.some((id) => specRecordIds.includes(id)) && specs.some((spec) => issue.specIds.includes(spec.id) && spec.projectId === projectId));
      const unique = [...new Map(matching.map((issue) => [issue.id, issue])).values()]
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime() || right.id.localeCompare(left.id));
      return { issues: unique.slice((page - 1) * limit, page * limit), total: unique.length };
    });
  });

  it("links multiple scenarios and Specs with independent Result and Issue pagination", async () => {
    await testScenarioIntegrationService.addSpecLink({ scenarioId: scenarioA, specId: specA, projectId: projectA });
    await testScenarioIntegrationService.addSpecLink({ scenarioId: scenarioA, specId: specB, projectId: projectA });
    await testScenarioIntegrationService.addSpecLink({ scenarioId: scenarioB, specId: specB, projectId: projectA });

    const resultPageOne = await testScenarioIntegrationService.getResults({ scenarioId: scenarioA, projectId: projectA, page: 1, limit: 1 });
    const resultPageTwo = await testScenarioIntegrationService.getResults({ scenarioId: scenarioA, projectId: projectA, page: 2, limit: 1 });
    const issuePageOne = await testScenarioIntegrationService.getIssues({ scenarioId: scenarioA, projectId: projectA, page: 1, limit: 1 });
    const issuePageTwo = await testScenarioIntegrationService.getIssues({ scenarioId: scenarioA, projectId: projectA, page: 2, limit: 1 });

    expect(resultPageOne.linkedSpecCount).toBe(2);
    expect(resultPageOne.total).toBe(2);
    expect(resultPageOne.results[0]?.id).toBe("result-b");
    expect(resultPageTwo.results[0]?.id).toBe("result-a");
    expect(issuePageOne.total).toBe(2);
    expect(issuePageOne.issues[0]?.id).toBe("issue-b");
    expect(issuePageTwo.issues[0]?.id).toBe("issue-shared");

    const scenarioBResults = await testScenarioIntegrationService.getResults({ scenarioId: scenarioB, projectId: projectA });
    expect(scenarioBResults.linkedSpecCount).toBe(1);
    expect(scenarioBResults.results.map((result) => result.id)).toEqual(["result-b"]);
  });

  it("unlinks only the association and preserves endpoints and evidence", async () => {
    await testScenarioIntegrationService.addSpecLink({ scenarioId: scenarioA, specId: specA, projectId: projectA });
    await testScenarioIntegrationService.addSpecLink({ scenarioId: scenarioA, specId: specB, projectId: projectA });
    const endpointSnapshot = {
      scenarios: scenarios.map((scenario) => ({ ...scenario })),
      specs: specs.map((spec) => ({ ...spec })),
      results: resultEvidence.map((result) => ({ ...result })),
      resultErrors: resultErrors.map((error) => ({ ...error })),
      assumptions: assumptions.map((assumption) => ({ ...assumption })),
      issues: issueEvidence.map((issue) => ({ ...issue })),
    };

    await testScenarioIntegrationService.removeSpecLink({ scenarioId: scenarioA, specId: specA, projectId: projectA });

    expect(scenarios).toEqual(endpointSnapshot.scenarios);
    expect(specs).toEqual(endpointSnapshot.specs);
    expect(resultEvidence).toEqual(endpointSnapshot.results);
    expect(resultErrors).toEqual(endpointSnapshot.resultErrors);
    expect(assumptions).toEqual(endpointSnapshot.assumptions);
    expect(issueEvidence).toEqual(endpointSnapshot.issues);
    await expect(testScenarioIntegrationService.getResults({ scenarioId: scenarioA, projectId: projectA })).resolves.toEqual(expect.objectContaining({ linkedSpecCount: 1, total: 1 }));
  });

  it("preserves Spec links and derived evidence when scenario content changes", async () => {
    await testScenarioIntegrationService.addSpecLink({ scenarioId: scenarioA, specId: specA, projectId: projectA });
    await testScenarioIntegrationService.addSpecLink({ scenarioId: scenarioA, specId: specB, projectId: projectA });
    const snapshot = {
      scenarios: scenarios.map((scenario) => ({ ...scenario })),
      links: links.map((link) => ({ ...link })),
      specs: specs.map((spec) => ({ ...spec })),
      results: resultEvidence.map((result) => ({ ...result })),
      resultErrors: resultErrors.map((error) => ({ ...error })),
      assumptions: assumptions.map((assumption) => ({ ...assumption })),
      issues: issueEvidence.map((issue) => ({ ...issue })),
    };

    await testScenarioService.updateScenario({
      scenarioId: scenarioA,
      projectId: projectA,
      title: "Updated title",
    });
    await testScenarioService.updateScenario({
      scenarioId: scenarioA,
      projectId: projectA,
      contentMd: "# Updated Markdown",
    });

    expect(scenarios).toEqual(snapshot.scenarios);
    expect(links).toEqual(snapshot.links);
    expect(specs).toEqual(snapshot.specs);
    expect(resultEvidence).toEqual(snapshot.results);
    expect(resultErrors).toEqual(snapshot.resultErrors);
    expect(assumptions).toEqual(snapshot.assumptions);
    expect(issueEvidence).toEqual(snapshot.issues);
    await expect(
      testScenarioIntegrationService.getResults({ scenarioId: scenarioA, projectId: projectA }),
    ).resolves.toEqual(expect.objectContaining({ linkedSpecCount: 2, total: 2 }));
    await expect(
      testScenarioIntegrationService.getIssues({ scenarioId: scenarioA, projectId: projectA }),
    ).resolves.toEqual(expect.objectContaining({ linkedSpecCount: 2, total: 2 }));
  });

  it("removes scenario links while preserving Specs and evidence on scenario deletion", async () => {
    await testScenarioIntegrationService.addSpecLink({ scenarioId: scenarioA, specId: specA, projectId: projectA });
    const specsSnapshot = specs.map((spec) => ({ ...spec }));
    const evidenceSnapshot = resultEvidence.map((result) => ({ ...result }));
    const resultErrorsSnapshot = resultErrors.map((error) => ({ ...error }));
    const assumptionsSnapshot = assumptions.map((assumption) => ({ ...assumption }));

    await testScenarioService.deleteScenario(scenarioA, projectA);

    expect(scenarios.some((scenario) => scenario.id === scenarioA)).toBe(false);
    expect(links).toEqual([]);
    expect(specs).toEqual(specsSnapshot);
    expect(resultEvidence).toEqual(evidenceSnapshot);
    expect(resultErrors).toEqual(resultErrorsSnapshot);
    expect(assumptions).toEqual(assumptionsSnapshot);
  });

  it("removes Spec links while preserving linked scenarios on Spec deletion", async () => {
    await testScenarioIntegrationService.addSpecLink({ scenarioId: scenarioA, specId: specA, projectId: projectA });
    await testScenarioIntegrationService.addSpecLink({ scenarioId: scenarioB, specId: specB, projectId: projectA });

    await specService.deleteSpec(specA, projectA);

    expect(scenarios).toEqual([
      { id: scenarioA, projectId: projectA },
      { id: scenarioB, projectId: projectA },
    ]);
    expect(links).toEqual([{ testScenarioId: scenarioB, specId: specB }]);
    expect(resultEvidence).toHaveLength(2);
    expect(resultErrors).toHaveLength(2);
    expect(assumptions).toHaveLength(2);
    expect(issueEvidence).toHaveLength(2);
  });
});
