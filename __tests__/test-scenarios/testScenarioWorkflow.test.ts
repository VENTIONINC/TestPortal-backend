// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import type { TestScenario } from "@prisma/client";
import { executeController } from "@/test-utils/httpMocks";

const mockProjects = new Set<string>();
const mockScenarios: TestScenario[] = [];
let mockNextId = 0;

jest.mock("@/models/projectModel", () => ({
  projectModel: {
    exists: jest.fn((projectId: string) =>
      Promise.resolve(mockProjects.has(projectId)),
    ),
  },
}));

jest.mock("@/models/testScenarioModel", () => ({
  testScenarioModel: {
    create: jest.fn((data: {
      projectId: string;
      title: string;
      contentMd: string;
      createdById: string;
      details?: string | null;
    }) => {
      mockNextId += 1;
      const scenario: TestScenario = {
        id: `00000000-0000-0000-0000-${String(mockNextId).padStart(12, "0")}`,
        projectId: data.projectId,
        createdById: data.createdById,
        title: data.title,
        contentMd: data.contentMd,
        details: data.details ?? null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      };
      mockScenarios.push(scenario);
      return Promise.resolve(scenario);
    }),
    findManySummaries: jest.fn(
      (projectId: string, pageInput?: number, limitInput?: number) => {
        const page = pageInput ?? 1;
        const limit = limitInput ?? 30;
        const matching = mockScenarios
          .filter((scenario) => scenario.projectId === projectId)
          .sort(
            (left, right) =>
              right.createdAt.getTime() - left.createdAt.getTime() ||
              right.id.localeCompare(left.id),
          );
        const start = (page - 1) * limit;
        return Promise.resolve(
          matching.slice(start, start + limit).map((scenario) => ({
            id: scenario.id,
            projectId: scenario.projectId,
            createdById: scenario.createdById,
            title: scenario.title,
            details: scenario.details,
            createdBy: {
              id: scenario.createdById,
              name: "Scenario Creator",
              email: "creator@example.com",
            },
            createdAt: scenario.createdAt,
            updatedAt: scenario.updatedAt,
          })),
        );
      },
    ),
    count: jest.fn((projectId: string) =>
      Promise.resolve(
        mockScenarios.filter((scenario) => scenario.projectId === projectId)
          .length,
      ),
    ),
    findById: jest.fn((id: string, projectId: string) =>
      Promise.resolve(
        mockScenarios.find(
          (scenario) => scenario.id === id && scenario.projectId === projectId,
        ) ?? null,
      ),
    ),
    update: jest.fn(
      (
        id: string,
        projectId: string,
        data: { title?: string; contentMd?: string; details?: string | null },
      ) => {
        const scenario = mockScenarios.find(
          (candidate) => candidate.id === id && candidate.projectId === projectId,
        );
        if (!scenario) return Promise.resolve(null);

        Object.assign(scenario, data, {
          updatedAt: new Date("2026-01-02T00:00:00.000Z"),
        });
        return Promise.resolve({ ...scenario });
      },
    ),
    delete: jest.fn((id: string, projectId: string) => {
      const index = mockScenarios.findIndex(
        (scenario) => scenario.id === id && scenario.projectId === projectId,
      );
      if (index === -1) return Promise.resolve(0);
      mockScenarios.splice(index, 1);
      return Promise.resolve(1);
    }),
  },
}));

import { testScenarioController } from "@/controllers/testScenarioController";

const projectA = "11111111-1111-1111-1111-111111111111";
const projectB = "22222222-2222-2222-2222-222222222222";
const creatorId = "33333333-3333-3333-3333-333333333333";
const spoofedCreatorId = "44444444-4444-4444-4444-444444444444";
const authenticatedUser = {
  id: creatorId,
  name: "Scenario Creator",
  email: "creator@example.com",
  status: "active",
  role: "member",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
} as const;

describe("test-scenario project-isolated workflow", () => {
  beforeEach(() => {
    mockProjects.clear();
    mockScenarios.length = 0;
    mockNextId = 0;
    mockProjects.add(projectA);
    mockProjects.add(projectB);
  });

  it("round-trips Markdown, paginates deterministically, and isolates projects", async () => {
    const exactMarkdown = "# Heading\n\n  ✓ indented\n\n```ts\nconst x = 1;\n```\n";
    const first = await executeController(testScenarioController.create, {
      method: "POST",
      user: authenticatedUser,
      body: {
        projectId: projectA,
        title: "  First  ",
        contentMd: exactMarkdown,
        details: "  First details  ",
      },
    });
    const second = await executeController(testScenarioController.create, {
      method: "POST",
      user: authenticatedUser,
      body: { projectId: projectA, title: "Second", contentMd: "## Second" },
    });
    await executeController(testScenarioController.create, {
      method: "POST",
      user: authenticatedUser,
      body: { projectId: projectB, title: "Other project", contentMd: "# Other" },
    });

    expect(first.statusCode).toBe(201);
    expect((first.body as TestScenario).title).toBe("First");
    expect((first.body as TestScenario).createdById).toBe(creatorId);
    expect((first.body as TestScenario).createdById).not.toBe(spoofedCreatorId);
    expect((first.body as TestScenario).details).toBe("First details");
    expect((first.body as TestScenario).contentMd).toBe(exactMarkdown);

    const pageOne = await executeController(testScenarioController.list, {
      query: { projectId: projectA, page: "1", limit: "1" },
    });
    expect(pageOne.body).toEqual(expect.objectContaining({
      total: 2,
      page: 1,
      limit: 1,
      totalPages: 2,
    }));
    expect((pageOne.body as { scenarios: TestScenario[] }).scenarios).toHaveLength(1);
    const summary = (pageOne.body as {
      scenarios: Array<Record<string, unknown>>;
    }).scenarios[0];
    expect(Object.keys(summary ?? {}).sort()).toEqual([
      "createdAt",
      "createdBy",
      "createdById",
      "details",
      "id",
      "projectId",
      "title",
      "updatedAt",
    ]);
    expect(summary?.createdBy).toEqual({
      id: creatorId,
      name: "Scenario Creator",
      email: "creator@example.com",
    });

    const pageTwo = await executeController(testScenarioController.list, {
      query: { projectId: projectA, page: "2", limit: "1" },
    });
    expect((pageTwo.body as { scenarios: TestScenario[] }).scenarios[0]?.title).toBe(
      "First",
    );

    const scenarioId = (first.body as TestScenario).id;
    const crossProjectDetail = await executeController(
      testScenarioController.getById,
      { params: { scenarioId }, query: { projectId: projectB } },
    );
    expect(crossProjectDetail.statusCode).toBe(404);

    const crossProjectDelete = await executeController(
      testScenarioController.delete,
      { method: "DELETE", params: { scenarioId }, query: { projectId: projectB } },
    );
    expect(crossProjectDelete.statusCode).toBe(404);

    const detail = await executeController(testScenarioController.getById, {
      params: { scenarioId },
      query: { projectId: projectA },
    });
    expect(detail.statusCode).toBe(200);
    expect((detail.body as TestScenario).contentMd).toBe(exactMarkdown);

    const deleteResponse = await executeController(testScenarioController.delete, {
      method: "DELETE",
      params: { scenarioId },
      query: { projectId: projectA },
    });
    expect(deleteResponse.statusCode).toBe(204);

    const remaining = await executeController(testScenarioController.list, {
      query: { projectId: projectA },
    });
    expect((remaining.body as { scenarios: TestScenario[] }).scenarios).toHaveLength(1);
    expect((remaining.body as { scenarios: TestScenario[] }).scenarios[0]?.title).toBe(
      "Second",
    );
    expect(second.statusCode).toBe(201);
  });

  it("round-trips exact Markdown and preserves immutable metadata on updates", async () => {
    const created = await executeController(testScenarioController.create, {
      method: "POST",
      user: authenticatedUser,
      body: { projectId: projectA, title: "Original", contentMd: "# Original" },
    });
    const original = { ...(created.body as TestScenario) };
    const exactMarkdown =
      "# Ünïcøde heading\r\n\r\n  indented text  \r\n\r\n```typescript\r\n\tconst value = `✓`;\r\n```\r\n";

    const updated = await executeController(testScenarioController.update, {
      method: "PATCH",
      params: { scenarioId: original.id },
      query: { projectId: projectA },
      body: { title: "  Revised title  ", contentMd: exactMarkdown },
    });
    const updatedScenario = updated.body as TestScenario;

    expect(updated.statusCode).toBe(200);
    expect(updatedScenario.title).toBe("Revised title");
    expect(updatedScenario.contentMd).toBe(exactMarkdown);
    expect(updatedScenario.id).toBe(original.id);
    expect(updatedScenario.projectId).toBe(original.projectId);
    expect(updatedScenario.createdById).toBe(original.createdById);
    expect(updatedScenario.createdAt).toBe(original.createdAt);
    expect(updatedScenario.updatedAt.getTime()).toBeGreaterThan(
      original.updatedAt.getTime(),
    );

    const detailsUpdated = await executeController(
      testScenarioController.update,
      {
        method: "PATCH",
        params: { scenarioId: original.id },
        query: { projectId: projectA },
        body: { details: "  Revised details  " },
      },
    );
    const detailsScenario = detailsUpdated.body as TestScenario;
    expect(detailsUpdated.statusCode).toBe(200);
    expect(detailsScenario.details).toBe("Revised details");
    expect(detailsScenario.contentMd).toBe(exactMarkdown);
    expect(detailsScenario.id).toBe(original.id);
    expect(detailsScenario.createdById).toBe(original.createdById);

    const cleared = await executeController(testScenarioController.update, {
      method: "PATCH",
      params: { scenarioId: original.id },
      query: { projectId: projectA },
      body: { details: null },
    });
    expect(cleared.statusCode).toBe(200);
    expect((cleared.body as TestScenario).details).toBeNull();

    const detail = await executeController(testScenarioController.getById, {
      params: { scenarioId: original.id },
      query: { projectId: projectA },
    });
    expect((detail.body as TestScenario).contentMd).toBe(exactMarkdown);

    const whitespaceOnly = " \t\r\n  ";
    const whitespaceUpdate = await executeController(
      testScenarioController.update,
      {
        method: "PATCH",
        params: { scenarioId: original.id },
        query: { projectId: projectA },
        body: { contentMd: whitespaceOnly },
      },
    );
    expect((whitespaceUpdate.body as TestScenario).contentMd).toBe(whitespaceOnly);

    const firstWrite = await executeController(testScenarioController.update, {
      method: "PATCH",
      params: { scenarioId: original.id },
      query: { projectId: projectA },
      body: { title: "First write" },
    });
    const lastWrite = await executeController(testScenarioController.update, {
      method: "PATCH",
      params: { scenarioId: original.id },
      query: { projectId: projectA },
      body: { title: "Last write" },
    });
    expect((firstWrite.body as TestScenario).title).toBe("First write");
    expect((lastWrite.body as TestScenario).title).toBe("Last write");

    const rejected = await executeController(testScenarioController.update, {
      method: "PATCH",
      params: { scenarioId: original.id },
      query: { projectId: projectA },
      body: {},
    });
    expect(rejected.statusCode).toBe(400);

    const crossProject = await executeController(testScenarioController.update, {
      method: "PATCH",
      params: { scenarioId: original.id },
      query: { projectId: projectB },
      body: { title: "Should not apply" },
    });
    expect(crossProject.statusCode).toBe(404);

    const unchangedAfterRejection = await executeController(
      testScenarioController.getById,
      { params: { scenarioId: original.id }, query: { projectId: projectA } },
    );
    expect((unchangedAfterRejection.body as TestScenario).title).toBe("Last write");
    expect((unchangedAfterRejection.body as TestScenario).contentMd).toBe(
      whitespaceOnly,
    );
  });
});
