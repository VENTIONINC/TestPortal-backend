// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import type { TestScenario } from "@prisma/client";

const mockProjectExists = jest.fn<() => Promise<boolean>>();
const mockCreate = jest.fn<() => Promise<TestScenario>>();
const mockFindMany = jest.fn<() => Promise<TestScenario[]>>();
const mockCount = jest.fn<() => Promise<number>>();
const mockFindById = jest.fn<() => Promise<TestScenario | null>>();
const mockDelete = jest.fn<() => Promise<number>>();

jest.mock("@/models/projectModel", () => ({
  projectModel: {
    exists: mockProjectExists,
  },
}));

jest.mock("@/models/testScenarioModel", () => ({
  testScenarioModel: {
    create: mockCreate,
    findMany: mockFindMany,
    count: mockCount,
    findById: mockFindById,
    delete: mockDelete,
  },
}));

import { testScenarioService } from "@/services/testScenarioService";
import {
  TestScenarioNotFoundError,
  TestScenarioValidationError,
} from "@/types/testScenarios";

const projectId = "11111111-1111-1111-1111-111111111111";
const otherProjectId = "22222222-2222-2222-2222-222222222222";
const scenario: TestScenario = {
  id: "33333333-3333-3333-3333-333333333333",
  projectId,
  createdById: "44444444-4444-4444-4444-444444444444",
  title: "Login",
  contentMd: "# Login\n\n```ts\n  const value = '✓';\n```\n",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("testScenarioService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProjectExists.mockResolvedValue(true);
    mockCreate.mockResolvedValue(scenario);
    mockFindMany.mockResolvedValue([scenario]);
    mockCount.mockResolvedValue(1);
    mockFindById.mockResolvedValue(scenario);
    mockDelete.mockResolvedValue(1);
  });

  it("trims titles and preserves Markdown exactly", async () => {
    const contentMd = "# Heading\n\n  indented ✓\n";

    const result = await testScenarioService.createScenario({
      projectId,
      title: "  Scenario title  ",
      contentMd,
      createdById: scenario.createdById,
    });

    expect(mockCreate).toHaveBeenCalledWith({
      projectId,
      title: "Scenario title",
      contentMd,
      createdById: scenario.createdById,
    });
    expect(result).toBe(scenario);
  });

  it("rejects creation for an unknown project before persistence", async () => {
    mockProjectExists.mockResolvedValue(false);

    await expect(
      testScenarioService.createScenario({
      projectId: otherProjectId,
      title: "Scenario",
      contentMd: "content",
      createdById: scenario.createdById,
      }),
    ).rejects.toBeInstanceOf(TestScenarioNotFoundError);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns stable pagination metadata and forwards page offsets", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(61);

    const result = await testScenarioService.listScenarios({
      projectId,
      page: 3,
      limit: 30,
    });

    expect(mockFindMany).toHaveBeenCalledWith(projectId, 3, 30);
    expect(mockCount).toHaveBeenCalledWith(projectId);
    expect(result).toEqual({
      scenarios: [],
      total: 61,
      page: 3,
      limit: 30,
      totalPages: 3,
    });
  });

  it("returns an empty page for an unknown project without disclosing records", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const result = await testScenarioService.listScenarios({
      projectId: otherProjectId,
    });

    expect(result.scenarios).toEqual([]);
    expect(result.totalPages).toBe(0);
    expect(mockFindMany).toHaveBeenCalledWith(otherProjectId, 1, 30);
  });

  it("classifies cross-project detail access as not found", async () => {
    mockFindById.mockResolvedValue(null);

    await expect(
      testScenarioService.getScenarioById(scenario.id, otherProjectId),
    ).rejects.toBeInstanceOf(TestScenarioNotFoundError);
    expect(mockFindById).toHaveBeenCalledWith(scenario.id, otherProjectId);
  });

  it("classifies invalid service pagination as validation failure", async () => {
    await expect(
      testScenarioService.listScenarios({ projectId, page: 0, limit: 30 }),
    ).rejects.toBeInstanceOf(TestScenarioValidationError);
  });

  it("deletes only the requested project scenario", async () => {
    await testScenarioService.deleteScenario(scenario.id, projectId);

    expect(mockDelete).toHaveBeenCalledWith(scenario.id, projectId);
  });

  it("does not report deletion success when the composite identity is absent", async () => {
    mockDelete.mockResolvedValue(0);

    await expect(
      testScenarioService.deleteScenario(scenario.id, otherProjectId),
    ).rejects.toBeInstanceOf(TestScenarioNotFoundError);
  });
});
