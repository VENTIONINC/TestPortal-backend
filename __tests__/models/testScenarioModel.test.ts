// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import type { TestScenario } from "@prisma/client";

const createMock = jest.fn<() => Promise<TestScenario>>();
const findManyMock = jest.fn<() => Promise<TestScenario[]>>();
const countMock = jest.fn<() => Promise<number>>();
const findFirstMock = jest.fn<() => Promise<TestScenario | null>>();
const deleteManyMock = jest.fn<() => Promise<{ count: number }>>();

jest.mock("@/prisma/client", () => ({
  dbClient: {
    testScenario: {
      create: createMock,
      findMany: findManyMock,
      count: countMock,
      findFirst: findFirstMock,
      deleteMany: deleteManyMock,
    },
  },
}));

import { testScenarioModel } from "@/models/testScenarioModel";

const scenario: TestScenario = {
  id: "11111111-1111-1111-1111-111111111111",
  projectId: "22222222-2222-2222-2222-222222222222",
  createdById: "33333333-3333-3333-3333-333333333333",
  title: "Login",
  contentMd: "# Login",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("testScenarioModel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createMock.mockResolvedValue(scenario);
    findManyMock.mockResolvedValue([scenario]);
    countMock.mockResolvedValue(1);
    findFirstMock.mockResolvedValue(scenario);
    deleteManyMock.mockResolvedValue({ count: 1 });
  });

  it("creates only the authored scenario fields", async () => {
    await testScenarioModel.create({
      projectId: scenario.projectId,
      title: scenario.title,
      contentMd: scenario.contentMd,
      createdById: scenario.createdById,
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        projectId: scenario.projectId,
        title: scenario.title,
        contentMd: scenario.contentMd,
        createdById: scenario.createdById,
      },
    });
  });

  it("lists by project with deterministic ordering and offset pagination", async () => {
    await testScenarioModel.findMany(scenario.projectId, 3, 10);

    expect(findManyMock).toHaveBeenCalledWith({
      where: { projectId: scenario.projectId },
      skip: 20,
      take: 10,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
  });

  it("uses the same project predicate for list and count", async () => {
    await testScenarioModel.findMany(scenario.projectId);
    await testScenarioModel.count(scenario.projectId);

    expect(findManyMock).toHaveBeenCalledWith({
      where: { projectId: scenario.projectId },
      skip: 0,
      take: 30,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    expect(countMock).toHaveBeenCalledWith({
      where: { projectId: scenario.projectId },
    });
  });

  it("looks up by the composite scenario and project identity", async () => {
    await testScenarioModel.findById(scenario.id, scenario.projectId);

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: scenario.id, projectId: scenario.projectId },
    });
  });

  it("deletes only the composite identity and returns the affected count", async () => {
    const deletedCount = await testScenarioModel.delete(
      scenario.id,
      scenario.projectId,
    );

    expect(deletedCount).toBe(1);
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { id: scenario.id, projectId: scenario.projectId },
    });
  });
});
