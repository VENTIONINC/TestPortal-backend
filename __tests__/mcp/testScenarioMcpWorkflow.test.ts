// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import type { TestScenario } from "@prisma/client";
import type { MCPToolResponse } from "@/types";
import type {
  SerializedIssue,
  StructuredResultWithRelations,
} from "@/types/database";

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

interface ResultRecord {
  id: string;
  specId: string;
  startTime: Date;
}

interface IssueRecord extends SerializedIssue {
  specIds: string[];
}

const projectA = "11111111-1111-1111-1111-111111111111";
const projectB = "22222222-2222-2222-2222-222222222222";
const scenarioAId = "33333333-3333-3333-3333-333333333333";
const scenarioUnlinkedId = "44444444-4444-4444-4444-444444444444";
const scenarioOtherId = "55555555-5555-5555-5555-555555555555";
const specAId = "66666666-6666-6666-6666-666666666666";
const specBId = "77777777-7777-7777-7777-777777777777";

const scenarios: TestScenario[] = [];
const specs: SpecRecord[] = [];
const links: LinkRecord[] = [];
const results: ResultRecord[] = [];
const issues: IssueRecord[] = [];

const projectExistsMock = jest.fn<(projectId: string) => Promise<boolean>>();
const scenarioFindManySummariesMock =
  jest.fn<
    (projectId: string, page: number, limit: number) => Promise<unknown[]>
  >();
const scenarioCountMock = jest.fn<(projectId: string) => Promise<number>>();
const scenarioFindByIdMock =
  jest.fn<
    (scenarioId: string, projectId: string) => Promise<TestScenario | null>
  >();
const scenarioUpdateMock =
  jest.fn<
    (
      scenarioId: string,
      projectId: string,
      data: { title?: string; contentMd?: string },
    ) => Promise<TestScenario | null>
  >();
const scenarioDeleteMock =
  jest.fn<(scenarioId: string, projectId: string) => Promise<number>>();
const specFindByIdMock =
  jest.fn<(specId: string, projectId: string) => Promise<SpecRecord | null>>();
const linkFindIdsMock =
  jest.fn<(scenarioId: string, projectId: string) => Promise<string[]>>();
const linkCountMock =
  jest.fn<(scenarioId: string, projectId: string) => Promise<number>>();
const resultEvidenceMock =
  jest.fn<
    (params: {
      projectId: string;
      specRecordIds: string[];
      page: number;
      limit: number;
    }) => Promise<{ results: StructuredResultWithRelations[]; total: number }>
  >();
const issueEvidenceMock =
  jest.fn<
    (params: {
      projectId: string;
      specRecordIds: string[];
      page: number;
      limit: number;
    }) => Promise<{ issues: SerializedIssue[]; total: number }>
  >();

jest.mock("@/models/projectModel", () => ({
  projectModel: { exists: projectExistsMock },
}));
jest.mock("@/models/testScenarioModel", () => ({
  testScenarioModel: {
    findManySummaries: scenarioFindManySummariesMock,
    count: scenarioCountMock,
    findById: scenarioFindByIdMock,
    update: scenarioUpdateMock,
    delete: scenarioDeleteMock,
  },
}));
jest.mock("@/models/specModel", () => ({
  specModel: { findById: specFindByIdMock },
}));
jest.mock("@/models/testScenarioSpecLinkModel", () => ({
  testScenarioSpecLinkModel: {
    findLinkedSpecIds: linkFindIdsMock,
    countLinkedSpecs: linkCountMock,
  },
}));
jest.mock("@/services/resultService", () => ({
  resultService: { getResultsBySpecRecordIds: resultEvidenceMock },
}));
jest.mock("@/services/issueService", () => ({
  issueService: { getObservedIssuesBySpecRecordIds: issueEvidenceMock },
}));

import { mcpTestScenarioHandler } from "@/handlers/mcpTestScenarioHandler";
import {
  deleteTestScenario,
  getTestScenario,
  listTestScenarios,
  updateTestScenario,
} from "@/mcp/tools/test-scenarios";

const scenarioA: TestScenario = {
  id: scenarioAId,
  projectId: projectA,
  createdById: "88888888-8888-8888-8888-888888888888",
  title: "Login",
  contentMd: "  # Login\n\n  exact Markdown ✓\n",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};
const scenarioUnlinked: TestScenario = {
  ...scenarioA,
  id: scenarioUnlinkedId,
  title: "Unlinked",
  contentMd: "# Unlinked\n",
  createdAt: new Date("2025-12-31T00:00:00.000Z"),
};
const scenarioOther: TestScenario = {
  ...scenarioA,
  id: scenarioOtherId,
  projectId: projectB,
  title: "Other project",
};
const specA: SpecRecord = {
  id: specAId,
  projectId: projectA,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  key: "spec-a",
  file: "a.spec.ts",
  title: "A",
  tags: [],
  annotations: [],
};
const specB: SpecRecord = {
  ...specA,
  id: specBId,
  key: "spec-b",
  file: "b.spec.ts",
  title: "B",
  createdAt: new Date("2026-01-02T00:00:00.000Z"),
};
const resultA: ResultRecord = {
  id: "99999999-9999-9999-9999-999999999991",
  specId: specAId,
  startTime: new Date("2026-01-01T00:00:00.000Z"),
};
const resultB: ResultRecord = {
  id: "99999999-9999-9999-9999-999999999992",
  specId: specBId,
  startTime: new Date("2026-01-02T00:00:00.000Z"),
};
const issueShared: IssueRecord = {
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  name: "Shared issue",
  category: "bug",
  description: null,
  portal: null,
  service: null,
  ticket: null,
  createdBy: null,
  updatedBy: null,
  specIds: [specAId, specBId],
};
const issueB: IssueRecord = {
  ...issueShared,
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
  name: "B issue",
  specIds: [specBId],
  createdAt: new Date("2026-01-03T00:00:00.000Z"),
};

const toolHandler = (
  handler: unknown,
): ((input: unknown) => Promise<MCPToolResponse>) =>
  handler as (input: unknown) => Promise<MCPToolResponse>;

const invokeTool = async (
  handler: unknown,
  input: unknown,
): Promise<{ response: MCPToolResponse; data?: unknown }> => {
  const response = await toolHandler(handler)(input);
  if (response.isError) return { response };

  const text = response.content[0]?.text;
  if (!text) throw new Error("MCP response did not contain text");
  return { response, data: JSON.parse(text) as unknown };
};

describe("Test Scenario MCP workflow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    scenarios.splice(
      0,
      scenarios.length,
      scenarioA,
      scenarioUnlinked,
      scenarioOther,
    );
    specs.splice(0, specs.length, specA, specB);
    links.splice(
      0,
      links.length,
      { testScenarioId: scenarioAId, specId: specAId },
      { testScenarioId: scenarioAId, specId: specBId },
    );
    results.splice(0, results.length, resultA, resultB);
    issues.splice(0, issues.length, issueShared, issueB);

    projectExistsMock.mockResolvedValue(true);
    scenarioFindManySummariesMock.mockImplementation(
      async (projectId, page, limit) =>
        scenarios
          .filter((scenario) => scenario.projectId === projectId)
          .sort(
            (left, right) =>
              right.createdAt.getTime() - left.createdAt.getTime() ||
              right.id.localeCompare(left.id),
          )
          .slice((page - 1) * limit, page * limit)
          .map(({ contentMd: _contentMd, ...summary }) => summary),
    );
    scenarioCountMock.mockImplementation(
      async (projectId) =>
        scenarios.filter((scenario) => scenario.projectId === projectId).length,
    );
    scenarioFindByIdMock.mockImplementation(
      async (scenarioId, projectId) =>
        scenarios.find(
          (scenario) =>
            scenario.id === scenarioId && scenario.projectId === projectId,
        ) ?? null,
    );
    scenarioUpdateMock.mockImplementation(
      async (scenarioId, projectId, data) => {
        const scenario = scenarios.find(
          (candidate) =>
            candidate.id === scenarioId && candidate.projectId === projectId,
        );
        if (!scenario) return null;
        Object.assign(scenario, data, {
          updatedAt: new Date("2026-01-02T00:00:00.000Z"),
        });
        return { ...scenario };
      },
    );
    scenarioDeleteMock.mockImplementation(async (scenarioId, projectId) => {
      const index = scenarios.findIndex(
        (scenario) =>
          scenario.id === scenarioId && scenario.projectId === projectId,
      );
      if (index < 0) return 0;
      scenarios.splice(index, 1);
      links.splice(
        0,
        links.length,
        ...links.filter((link) => link.testScenarioId !== scenarioId),
      );
      return 1;
    });
    specFindByIdMock.mockImplementation(
      async (specId, projectId) =>
        specs.find(
          (spec) => spec.id === specId && spec.projectId === projectId,
        ) ?? null,
    );
    linkFindIdsMock.mockImplementation(async (scenarioId, projectId) =>
      links
        .filter((link) => link.testScenarioId === scenarioId)
        .filter((link) =>
          specs.some(
            (spec) => spec.id === link.specId && spec.projectId === projectId,
          ),
        )
        .map((link) => link.specId),
    );
    linkCountMock.mockImplementation(
      async (scenarioId, projectId) =>
        links
          .filter((link) => link.testScenarioId === scenarioId)
          .filter((link) =>
            specs.some(
              (spec) => spec.id === link.specId && spec.projectId === projectId,
            ),
          ).length,
    );
    resultEvidenceMock.mockImplementation(
      async ({ projectId, specRecordIds, page, limit }) => {
        const matching = results
          .filter((result) => specRecordIds.includes(result.specId))
          .filter((result) =>
            specs.some(
              (spec) =>
                spec.id === result.specId && spec.projectId === projectId,
            ),
          )
          .sort(
            (left, right) =>
              right.startTime.getTime() - left.startTime.getTime() ||
              right.id.localeCompare(left.id),
          );
        return {
          results: matching.slice(
            (page - 1) * limit,
            page * limit,
          ) as unknown as StructuredResultWithRelations[],
          total: matching.length,
        };
      },
    );
    issueEvidenceMock.mockImplementation(
      async ({ projectId, specRecordIds, page, limit }) => {
        const matching = [
          ...new Map(
            issues
              .filter((issue) =>
                issue.specIds.some((specId) => specRecordIds.includes(specId)),
              )
              .filter((issue) =>
                issue.specIds.some((specId) =>
                  specs.some(
                    (spec) =>
                      spec.id === specId && spec.projectId === projectId,
                  ),
                ),
              )
              .map((issue) => [issue.id, issue]),
          ).values(),
        ].sort(
          (left, right) =>
            right.createdAt.getTime() - left.createdAt.getTime() ||
            right.id.localeCompare(left.id),
        );
        return {
          issues: matching.slice(
            (page - 1) * limit,
            page * limit,
          ) as SerializedIssue[],
          total: matching.length,
        };
      },
    );
  });

  it("lists compact summaries from one project without Markdown or cross-project records", async () => {
    const { response, data } = await invokeTool(listTestScenarios[3], {
      projectId: projectA,
    });
    const list = data as {
      scenarios: Array<Record<string, unknown>>;
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };

    expect(response.isError).toBeUndefined();
    expect(list).toMatchObject({ total: 2, page: 1, limit: 30, totalPages: 1 });
    expect(list.scenarios).toHaveLength(2);
    expect(
      list.scenarios.every((scenario) => scenario.projectId === projectA),
    ).toBe(true);
    expect(
      list.scenarios.every((scenario) => !Object.hasOwn(scenario, "contentMd")),
    ).toBe(true);
  });

  it("returns raw Markdown and linked deduplicated evidence with independent pages", async () => {
    const { data } = await invokeTool(getTestScenario[3], {
      scenarioId: scenarioAId,
      projectId: projectA,
      resultPage: 2,
      resultLimit: 1,
      issuePage: 1,
      issueLimit: 2,
    });
    const detail = data as {
      scenario: TestScenario;
      resultEvidence: {
        linkedSpecCount: number;
        results: Array<{ id: string }>;
        page: number;
        limit: number;
      };
      issueEvidence: {
        linkedSpecCount: number;
        issues: Array<{ id: string }>;
        page: number;
        limit: number;
      };
    };

    expect(detail.scenario.contentMd).toBe(scenarioA.contentMd);
    expect(detail.resultEvidence).toMatchObject({
      linkedSpecCount: 2,
      page: 2,
      limit: 1,
    });
    expect(detail.resultEvidence.results.map((result) => result.id)).toEqual([
      resultA.id,
    ]);
    expect(detail.issueEvidence).toMatchObject({
      linkedSpecCount: 2,
      page: 1,
      limit: 2,
    });
    expect(detail.issueEvidence.issues.map((issue) => issue.id)).toEqual([
      issueB.id,
      issueShared.id,
    ]);
  });

  it("returns empty evidence envelopes for an unlinked scenario", async () => {
    const { data } = await invokeTool(getTestScenario[3], {
      scenarioId: scenarioUnlinkedId,
      projectId: projectA,
    });
    const detail = data as {
      resultEvidence: {
        linkedSpecCount: number;
        results: unknown[];
        total: number;
      };
      issueEvidence: {
        linkedSpecCount: number;
        issues: unknown[];
        total: number;
      };
    };

    expect(detail.resultEvidence).toMatchObject({
      linkedSpecCount: 0,
      results: [],
      total: 0,
    });
    expect(detail.issueEvidence).toMatchObject({
      linkedSpecCount: 0,
      issues: [],
      total: 0,
    });
  });

  it("supports title-only, Markdown-only, combined, invalid, and cross-project updates", async () => {
    const titleUpdate = await invokeTool(updateTestScenario[3], {
      scenarioId: scenarioAId,
      projectId: projectA,
      title: "  Updated title  ",
    });
    expect((titleUpdate.data as TestScenario).title).toBe("Updated title");
    expect((titleUpdate.data as TestScenario).contentMd).toBe(
      scenarioA.contentMd,
    );

    const exactMarkdown = "\n  # Exact replacement ✓\n";
    const markdownUpdate = await invokeTool(updateTestScenario[3], {
      scenarioId: scenarioAId,
      projectId: projectA,
      contentMd: exactMarkdown,
    });
    expect((markdownUpdate.data as TestScenario).contentMd).toBe(exactMarkdown);
    expect((markdownUpdate.data as TestScenario).title).toBe("Updated title");

    const combinedUpdate = await invokeTool(updateTestScenario[3], {
      scenarioId: scenarioAId,
      projectId: projectA,
      title: "  Combined title ",
      contentMd: "# Combined\n",
    });
    expect(combinedUpdate.data).toMatchObject({
      title: "Combined title",
      contentMd: "# Combined\n",
    });

    const beforeInvalid = {
      ...scenarios.find((scenario) => scenario.id === scenarioAId),
    };
    const invalidUpdate = await invokeTool(updateTestScenario[3], {
      scenarioId: scenarioAId,
      projectId: projectA,
    });
    expect(invalidUpdate.response.isError).toBe(true);
    expect(scenarios.find((scenario) => scenario.id === scenarioAId)).toEqual(
      beforeInvalid,
    );

    const beforeCrossProject = {
      ...scenarios.find((scenario) => scenario.id === scenarioAId),
    };
    const crossProjectUpdate = await invokeTool(updateTestScenario[3], {
      scenarioId: scenarioAId,
      projectId: projectB,
      title: "Should not apply",
    });
    expect(crossProjectUpdate.response.isError).toBe(true);
    expect(scenarios.find((scenario) => scenario.id === scenarioAId)).toEqual(
      beforeCrossProject,
    );
  });

  it("deletes only the matching scenario and preserves linked Specs and evidence", async () => {
    const specsSnapshot = specs.map((spec) => ({ ...spec }));
    const resultsSnapshot = results.map((result) => ({ ...result }));
    const issuesSnapshot = issues.map((issue) => ({
      ...issue,
      specIds: [...issue.specIds],
    }));

    const crossProjectDelete = await invokeTool(deleteTestScenario[3], {
      scenarioId: scenarioAId,
      projectId: projectB,
    });
    expect(crossProjectDelete.response.isError).toBe(true);
    expect(scenarios.some((scenario) => scenario.id === scenarioAId)).toBe(
      true,
    );

    const deletion = await invokeTool(deleteTestScenario[3], {
      scenarioId: scenarioAId,
      projectId: projectA,
    });
    expect(deletion.data).toEqual({
      scenarioId: scenarioAId,
      projectId: projectA,
      deleted: true,
    });
    expect(scenarios.some((scenario) => scenario.id === scenarioAId)).toBe(
      false,
    );
    expect(links.some((link) => link.testScenarioId === scenarioAId)).toBe(
      false,
    );
    expect(specs).toEqual(specsSnapshot);
    expect(results).toEqual(resultsSnapshot);
    expect(issues).toEqual(issuesSnapshot);

    const afterDelete = await invokeTool(getTestScenario[3], {
      scenarioId: scenarioAId,
      projectId: projectA,
    });
    expect(afterDelete.response.isError).toBe(true);
  });

  it("keeps the handler service composition explicit", async () => {
    await mcpTestScenarioHandler.getTestScenario({
      scenarioId: scenarioAId,
      projectId: projectA,
      resultPage: 2,
      resultLimit: 1,
      issuePage: 1,
      issueLimit: 2,
    });

    expect(resultEvidenceMock).toHaveBeenCalledWith({
      projectId: projectA,
      specRecordIds: [specAId, specBId],
      page: 2,
      limit: 1,
    });
    expect(issueEvidenceMock).toHaveBeenCalledWith({
      projectId: projectA,
      specRecordIds: [specAId, specBId],
      page: 1,
      limit: 2,
    });
  });
});
