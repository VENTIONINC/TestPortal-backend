// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import type { Prisma, TestScenario } from "@prisma/client";

const createMock = jest.fn<() => Promise<TestScenario>>();
const findManyMock = jest.fn<(args: unknown) => Promise<TestScenario[]>>();
const countMock = jest.fn<() => Promise<number>>();
const findFirstMock = jest.fn<() => Promise<TestScenario | null>>();
const updateMock = jest.fn<
  (args: {
    where: { id: string };
    data: { title?: string; contentMd?: string };
  }) => Promise<TestScenario>
>();
const deleteManyMock = jest.fn<() => Promise<{ count: number }>>();
const transactionMock = jest.fn<
  (
    callback: (tx: Prisma.TransactionClient) => Promise<TestScenario | null>,
  ) => Promise<TestScenario | null>
>();

jest.mock("@/prisma/client", () => ({
  dbClient: {
    testScenario: {
      create: createMock,
      findMany: findManyMock,
      count: countMock,
      findFirst: findFirstMock,
      update: updateMock,
      deleteMany: deleteManyMock,
    },
    $transaction: transactionMock,
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
    updateMock.mockResolvedValue(scenario);
    deleteManyMock.mockResolvedValue({ count: 1 });
    transactionMock.mockImplementation(async (callback) =>
      callback({
        testScenario: {
          findFirst: findFirstMock,
          update: updateMock,
        },
      } as unknown as Prisma.TransactionClient),
    );
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

  it("lists compact summaries without selecting Markdown", async () => {
    await testScenarioModel.findManySummaries(scenario.projectId, 2, 10);

    expect(findManyMock).toHaveBeenCalledWith({
      where: { projectId: scenario.projectId },
      select: {
        id: true,
        projectId: true,
        createdById: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
      skip: 10,
      take: 10,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    const select = findManyMock.mock.calls[0]?.[0] as {
      select?: Record<string, boolean>;
    };
    expect(select.select).not.toHaveProperty("contentMd");
  });

  it("uses the project predicate and default pagination for summaries", async () => {
    await testScenarioModel.findManySummaries(scenario.projectId);

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: scenario.projectId },
        skip: 0,
        take: 30,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    );
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

  it("updates only a scenario found in the requested project transaction", async () => {
    const updated = { ...scenario, title: "Updated" };
    updateMock.mockResolvedValue(updated);

    await expect(
      testScenarioModel.update(
        scenario.id,
        scenario.projectId,
        { title: "Updated" },
      ),
    ).resolves.toBe(updated);

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: scenario.id, projectId: scenario.projectId },
    });
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: scenario.id },
      data: { title: "Updated" },
    });
  });

  it("returns null and does not mutate on a cross-project miss", async () => {
    findFirstMock.mockResolvedValue(null);

    await expect(
      testScenarioModel.update(
        scenario.id,
        "99999999-9999-9999-9999-999999999999",
        { contentMd: "# Unchanged" },
      ),
    ).resolves.toBeNull();

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("passes combined fields atomically and excludes immutable metadata", async () => {
    await testScenarioModel.update(scenario.id, scenario.projectId, {
      title: "Updated",
      contentMd: "# Updated",
    });

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: scenario.id },
      data: { title: "Updated", contentMd: "# Updated" },
    });
    expect(Object.keys(updateMock.mock.calls[0]?.[0]?.data ?? {})).toEqual([
      "title",
      "contentMd",
    ]);
  });

  it("preserves omitted fields by passing only supplied authored data", async () => {
    await testScenarioModel.update(scenario.id, scenario.projectId, {
      contentMd: "# Markdown only",
    });

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: scenario.id },
      data: { contentMd: "# Markdown only" },
    });
  });
});
