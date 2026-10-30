// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { Prisma } from "@prisma/client";
import type { TestScenario, TestScenarioStep } from "@prisma/client";

const projectFindUniqueMock = jest.fn<() => Promise<unknown>>();
const userFindManyMock = jest.fn<(args: unknown) => Promise<unknown>>();
const scenarioCreateMock = jest.fn<() => Promise<unknown>>();
const scenarioFindFirstMock = jest.fn<() => Promise<unknown>>();
const scenarioUpdateMock = jest.fn<() => Promise<unknown>>();
const scenarioDeleteMock = jest.fn<() => Promise<unknown>>();
const summaryFindManyMock = jest.fn<(args: unknown) => Promise<unknown>>();
const countMock = jest.fn<() => Promise<unknown>>();
const stepCreateManyMock = jest.fn<() => Promise<unknown>>();
const stepCreateMock = jest.fn<() => Promise<unknown>>();
const stepUpdateMock = jest.fn<() => Promise<unknown>>();
const stepUpdateManyMock = jest.fn<() => Promise<unknown>>();
const stepDeleteMock = jest.fn<() => Promise<unknown>>();
const queryRawMock = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const transactionMock = jest.fn<(callback: unknown) => Promise<unknown>>();

const tx = {
  project: { findUnique: projectFindUniqueMock },
  user: { findMany: userFindManyMock },
  testScenario: {
    create: scenarioCreateMock,
    findFirst: scenarioFindFirstMock,
    update: scenarioUpdateMock,
    delete: scenarioDeleteMock,
    findMany: summaryFindManyMock,
    count: countMock,
  },
  testScenarioStep: {
    createMany: stepCreateManyMock,
    create: stepCreateMock,
    update: stepUpdateMock,
    updateMany: stepUpdateManyMock,
    delete: stepDeleteMock,
  },
  $queryRaw: queryRawMock,
} as unknown as Prisma.TransactionClient;

jest.mock("@/prisma/client", () => ({
  dbClient: {
    $transaction: transactionMock,
    project: { findUnique: projectFindUniqueMock },
    user: { findMany: userFindManyMock },
    testScenario: {
      findMany: summaryFindManyMock,
      count: countMock,
    },
  },
}));

import { testScenarioModel } from "@/models/testScenarioModel";

const scenario: TestScenario = {
  id: "11111111-1111-1111-1111-111111111111",
  projectId: "22222222-2222-2222-2222-222222222222",
  folderId: null,
  createdById: "33333333-3333-3333-3333-333333333333",
  title: "Login",
  scenarioKey: null,
  details: null,
  preconditions: null,
  testData: null,
  priority: null,
  relatedIssueUrl: null,
  contentMd: "# Login\n\n## Steps\n_No steps defined._\n",
  contentMdHash: "a".repeat(64),
  contentMdFormatVersion: 1,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};
const step: TestScenarioStep = {
  id: "44444444-4444-4444-4444-444444444444",
  testScenarioId: scenario.id,
  position: 0,
  action: "Open login",
  expectedResult: null,
};
const aggregate = { ...scenario, steps: [step] };

describe("testScenarioModel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    transactionMock.mockImplementation(async (callback: unknown) =>
      (callback as (client: Prisma.TransactionClient) => Promise<unknown>)(tx),
    );
    projectFindUniqueMock.mockResolvedValue({ id: scenario.projectId });
    scenarioCreateMock.mockResolvedValue(scenario);
    scenarioFindFirstMock.mockResolvedValue(aggregate);
    scenarioUpdateMock.mockResolvedValue(scenario);
    scenarioDeleteMock.mockResolvedValue(scenario);
    queryRawMock.mockResolvedValue([{ id: scenario.id }]);
    stepCreateManyMock.mockResolvedValue({ count: 1 });
    stepCreateMock.mockResolvedValue(step);
    stepUpdateMock.mockResolvedValue(step);
    stepUpdateManyMock.mockResolvedValue({ count: 1 });
    stepDeleteMock.mockResolvedValue(step);
    summaryFindManyMock.mockResolvedValue([]);
    countMock.mockResolvedValue(0);
    userFindManyMock.mockResolvedValue([]);
  });

  it("creates structured fields, initial steps, and a generated projection atomically", async () => {
    const result = await testScenarioModel.create({
      projectId: scenario.projectId,
      createdById: scenario.createdById,
      title: scenario.title,
      details: "Details",
      steps: [{ action: step.action }],
    });

    expect(transactionMock).toHaveBeenCalled();
    expect(scenarioCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: scenario.projectId,
        title: scenario.title,
        details: "Details",
        contentMdHash: expect.any(String),
        contentMdFormatVersion: 1,
      }),
    });
    expect(stepCreateManyMock).toHaveBeenCalledWith({
      data: [
        {
          testScenarioId: scenario.id,
          position: 0,
          action: step.action,
          expectedResult: null,
        },
      ],
    });
    expect(result?.steps[0]?.id).toBe(step.id);
  });

  it("defaults omitted metadata to null and exposes persisted metadata on detail", async () => {
    await testScenarioModel.create({ projectId: scenario.projectId, createdById: scenario.createdById, title: "Login" });
    expect(scenarioCreateMock).toHaveBeenCalledWith({ data: expect.objectContaining({ priority: null, relatedIssueUrl: null }) });
    scenarioFindFirstMock.mockResolvedValue({ ...aggregate, priority: "medium", relatedIssueUrl: "https://example.com/1" });
    const result = await testScenarioModel.findById(scenario.id, scenario.projectId, tx);
    expect(result).toMatchObject({ priority: "medium", relatedIssueUrl: "https://example.com/1" });
    expect(result).not.toHaveProperty("objective");
    expect(result).not.toHaveProperty("expectedResult");
    expect(result).not.toHaveProperty("notes");
  });

  it("persists create metadata and clears only the supplied metadata field", async () => {
    await testScenarioModel.create({ projectId: scenario.projectId, createdById: scenario.createdById, title: "Login", priority: "low", relatedIssueUrl: "https://example.com/1" });
    expect(scenarioCreateMock).toHaveBeenCalledWith({ data: expect.objectContaining({ priority: "low", relatedIssueUrl: "https://example.com/1" }) });
    scenarioUpdateMock.mockClear();
    await testScenarioModel.update(scenario.id, scenario.projectId, { relatedIssueUrl: null });
    expect(scenarioUpdateMock).toHaveBeenNthCalledWith(1, { where: { id: scenario.id }, data: { relatedIssueUrl: null } });
  });

  it("keeps summary selection lightweight", async () => {
    await testScenarioModel.findManySummaries(scenario.projectId, 2, 10);
    expect(summaryFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: scenario.projectId },
        skip: 10,
        take: 10,
      }),
    );
    const selection = (
      summaryFindManyMock.mock.calls[0]?.[0] as
        | { select?: Record<string, unknown> }
        | undefined
    )?.select;
    expect(selection).not.toHaveProperty("contentMd");
    expect(selection).not.toHaveProperty("steps");
    expect(selection).toHaveProperty("priority", true);
  });

  it("builds one literal project-scoped predicate and deterministic order", async () => {
    summaryFindManyMock.mockResolvedValue([{ ...scenario, folder: null, createdBy: { id: scenario.createdById, name: "Creator", email: "creator@example.test" } }]);
    queryRawMock.mockResolvedValueOnce([{ id: scenario.id }]).mockResolvedValueOnce([{ total: 1n }]);

    await testScenarioModel.listSummaries({
      projectId: scenario.projectId,
      page: 2,
      limit: 10,
      search: "%_\\",
      createdById: scenario.createdById,
      sort: "title_asc",
    });

    expect(queryRawMock).toHaveBeenCalledTimes(2);
    expect(summaryFindManyMock).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: [scenario.id] }, projectId: scenario.projectId } }));
    expect(summaryFindManyMock).not.toHaveBeenCalledWith(expect.objectContaining({ select: expect.objectContaining({ contentMd: true }) }));
    expect(transactionMock).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });
  });

  it("applies exact priority filtering before list pagination", async () => {
    await testScenarioModel.listSummaries({ projectId: scenario.projectId, page: 1, limit: 10, priority: "high" });
    const query = queryRawMock.mock.calls[0]?.[0] as { sql?: string; values?: unknown[] } | undefined;
    expect(query?.sql).toContain('s."priority" =');
    expect(query?.values).toContain("high");
    const selection = (summaryFindManyMock.mock.calls[0]?.[0] as { select?: Record<string, unknown> } | undefined)?.select;
    expect(selection).toHaveProperty("priority", true);
  });

  it("combines priority, creator, folder, and search before calculating page totals", async () => {
    const folderId = "66666666-6666-6666-6666-666666666666";
    queryRawMock.mockResolvedValueOnce([{ id: folderId }]).mockResolvedValueOnce([{ id: scenario.id }]).mockResolvedValueOnce([{ total: 42n }]);
    summaryFindManyMock.mockResolvedValueOnce([{ ...scenario, folder: { name: "Cases" }, createdBy: { id: scenario.createdById, name: "Creator", email: "creator@example.test" } }]);
    const result = await testScenarioModel.listSummaries({ projectId: scenario.projectId, page: 2, limit: 10, priority: "high", createdById: scenario.createdById, folderId, search: "login" });
    const listQuery = queryRawMock.mock.calls[1]?.[0] as { sql?: string; values?: unknown[] } | undefined;
    expect(listQuery?.sql).toContain('s."priority" =');
    expect(listQuery?.sql).toContain('s."createdById" =');
    expect(listQuery?.sql).toContain('s."folderId" IN');
    expect(listQuery?.sql).toContain('LOWER(COALESCE(s."title"');
    expect(listQuery?.values).toEqual(expect.arrayContaining(["high", scenario.createdById, "login"]));
    expect(result.total).toBe(42);
    expect(result.scenarios).toHaveLength(1);
  });

  it("resolves unique matching scenario UUIDs without summary reads", async () => {
    queryRawMock.mockResolvedValueOnce([{ id: scenario.id }, { id: scenario.id }, { id: "55555555-5555-5555-5555-555555555555" }]);
    const ids = await testScenarioModel.resolveSelection({ projectId: scenario.projectId, priority: "high", search: "login" });
    expect(ids).toEqual([scenario.id, "55555555-5555-5555-5555-555555555555"]);
    expect(summaryFindManyMock).not.toHaveBeenCalled();
    const query = queryRawMock.mock.calls[0]?.[0] as { sql?: string; values?: unknown[] } | undefined;
    expect(query?.sql).toContain('s."priority" =');
    expect(query?.values).toContain("high");
  });

  it.each([0, 1, 100, 237])("resolves the full UUID set for %i matches", async (count) => {
    const ids = Array.from({ length: count }, (_, index) => ({ id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}` }));
    queryRawMock.mockResolvedValueOnce(ids);
    const result = await testScenarioModel.resolveSelection({ projectId: scenario.projectId, search: "needle" });
    expect(result).toHaveLength(count);
    expect(new Set(result).size).toBe(count);
  });

  it("discovers distinct project creators in stable UUID-identified options", async () => {
    userFindManyMock.mockResolvedValue([{ id: scenario.createdById, name: "Creator", email: "creator@example.test" }]);
    await testScenarioModel.listScenarioAuthors(scenario.projectId);
    expect(userFindManyMock).toHaveBeenCalledWith({
      where: { testScenariosCreated: { some: { projectId: scenario.projectId } } },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
  });

  it("locks the parent before updating fields and regenerates the projection", async () => {
    const result = await testScenarioModel.update(
      scenario.id,
      scenario.projectId,
      { priority: "high" },
    );
    expect(queryRawMock).toHaveBeenCalled();
    expect(scenarioUpdateMock).toHaveBeenCalledWith({
      where: { id: scenario.id },
      data: { priority: "high" },
    });
    expect(result?.contentMdHash).toHaveLength(64);
  });

  it("updates only the key without regenerating the Markdown projection", async () => {
    const result = await testScenarioModel.update(
      scenario.id,
      scenario.projectId,
      { scenarioKey: "R2" },
    );
    expect(scenarioUpdateMock).toHaveBeenCalledTimes(1);
    expect(scenarioUpdateMock).toHaveBeenCalledWith({
      where: { id: scenario.id },
      data: { scenarioKey: "R2" },
    });
    expect(result?.contentMd).toBe(scenario.contentMd);
    expect(result?.contentMdHash).toBe(scenario.contentMdHash);
    expect(result?.contentMdFormatVersion).toBe(scenario.contentMdFormatVersion);
  });

  it("does not update metadata outside the requested project", async () => {
    queryRawMock.mockResolvedValueOnce([]);
    await expect(testScenarioModel.update(scenario.id, "99999999-9999-4999-8999-999999999999", { priority: "high", relatedIssueUrl: "https://example.com/1" })).resolves.toBeNull();
    expect(scenarioUpdateMock).not.toHaveBeenCalled();
  });

  it("rejects stale reorder membership without changing steps", async () => {
    const result = await testScenarioModel.reorderSteps({
      scenarioId: scenario.id,
      projectId: scenario.projectId,
      stepIds: [],
    });
    expect(result).toEqual({ kind: "invalid-order" });
    expect(stepUpdateManyMock).not.toHaveBeenCalled();
  });
});
