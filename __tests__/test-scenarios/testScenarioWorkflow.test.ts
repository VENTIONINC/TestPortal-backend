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
    }) => {
      mockNextId += 1;
      const scenario: TestScenario = {
        id: `00000000-0000-0000-0000-${String(mockNextId).padStart(12, "0")}`,
        projectId: data.projectId,
        createdById: data.createdById,
        title: data.title,
        contentMd: data.contentMd,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      };
      mockScenarios.push(scenario);
      return Promise.resolve(scenario);
    }),
    findMany: jest.fn(
      (projectId: string, pageInput?: number, limitInput?: number) => {
        const page = pageInput ?? 1;
        const limit = limitInput ?? 30;
      const matching = mockScenarios
        .filter((scenario) => scenario.projectId === projectId)
        .sort((left, right) => right.id.localeCompare(left.id));
      const start = (page - 1) * limit;
      return Promise.resolve(matching.slice(start, start + limit));
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
        createdById: spoofedCreatorId,
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
});
