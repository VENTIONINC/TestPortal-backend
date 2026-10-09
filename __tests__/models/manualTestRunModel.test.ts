// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";
import { Prisma } from "@prisma/client";
import type { ManualTestRunResponse } from "@/types/manualTestRuns";

const transactionMock = jest.fn<
  (callback: unknown, options?: unknown) => Promise<unknown>
>();

jest.mock("@/prisma/client", () => ({
  dbClient: { $transaction: transactionMock },
}));

import { manualTestRunModel } from "@/models/manualTestRunModel";

const projectId = "11111111-1111-4111-8111-111111111111";
const scenarioId = "22222222-2222-4222-8222-222222222222";
const runId = "33333333-3333-4333-8333-333333333333";
const executorId = "44444444-4444-4444-8444-444444444444";
const stepId = "55555555-5555-4555-8555-555555555555";

const detail = {
  id: runId,
  projectId,
  sourceTestScenarioId: scenarioId,
  testScenarioId: scenarioId,
  executedById: executorId,
  executedBy: { id: executorId, name: "Tester", email: "tester@example.test" },
  status: "in_progress",
  startedAt: new Date("2026-01-01T00:00:00.000Z"),
  completedAt: null,
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  title: "Login",
  details: "Details",
  objective: "Verify login",
  preconditions: null,
  testData: null,
  expectedResult: "Dashboard",
  scenarioNotes: "Keep evidence",
  notes: null,
  steps: [
    {
      id: stepId,
      position: 0,
      action: "Open login",
      expectedResult: "Login form",
      status: "not_started",
      notes: null,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  ],
} as ManualTestRunResponse;

function createTransactionClient() {
  const asyncMock = (): jest.Mock<(...args: never[]) => Promise<unknown>> =>
    jest.fn<(...args: never[]) => Promise<unknown>>();
  return {
    $queryRaw: asyncMock(),
    project: { findUnique: asyncMock() },
    testScenario: { findFirst: asyncMock() },
    manualTestRun: {
      create: asyncMock(),
      findFirst: asyncMock(),
      findUnique: asyncMock(),
      update: asyncMock(),
      findMany: asyncMock(),
      count: asyncMock(),
    },
    manualTestRunStep: {
      findMany: asyncMock(),
      findFirst: asyncMock(),
      update: asyncMock(),
    },
  };
}

describe("manualTestRunModel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("locks the project, source scenario, and executor before creating a full snapshot", async () => {
    const tx = createTransactionClient();
    tx.$queryRaw
      .mockResolvedValueOnce([{ id: projectId }])
      .mockResolvedValueOnce([{ id: scenarioId }])
      .mockResolvedValueOnce([{ id: executorId }]);
    tx.testScenario.findFirst.mockResolvedValue({
      id: scenarioId,
      title: "Login",
      scenarioKey: "R1",
      details: "Details",
      objective: "Verify login",
      preconditions: null,
      testData: null,
      expectedResult: "Dashboard",
      notes: "Keep evidence",
      steps: [
        { position: 0, action: "Open login", expectedResult: "Login form" },
      ],
    });
    tx.manualTestRun.create.mockResolvedValue(detail);
    transactionMock.mockImplementation(async (callback: unknown) =>
      await (callback as (client: Prisma.TransactionClient) => Promise<unknown>)(
        tx as unknown as Prisma.TransactionClient,
      ),
    );

    const result = await manualTestRunModel.createFromScenario({
      projectId,
      scenarioId,
      executedById: executorId,
      notes: "Execution notes",
    });

    expect(result).toEqual(detail);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(3);
    expect(tx.manualTestRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceTestScenarioId: scenarioId,
          sourceScenarioKey: "R1",
          runKey: null,
          title: "Login",
          details: "Details",
          scenarioNotes: "Keep evidence",
          notes: "Execution notes",
          steps: {
            create: [
              expect.objectContaining({
                position: 0,
                action: "Open login",
                status: "not_started",
              }),
            ],
          },
        }),
      }),
    );
  });

  it.each(["in_progress", "passed", "failed", "blocked", "skipped"] as const)(
    "reassigns an executor on a %s run without updating execution fields",
    async (status) => {
      const tx = createTransactionClient();
      tx.$queryRaw
        .mockResolvedValueOnce([{ id: runId }])
        .mockResolvedValueOnce([{ id: executorId, status: "active" }]);
      tx.manualTestRun.findFirst.mockResolvedValue({ ...detail, status });
      transactionMock.mockImplementation(async (callback: unknown) =>
        await (callback as (client: Prisma.TransactionClient) => Promise<unknown>)(
          tx as unknown as Prisma.TransactionClient,
        ),
      );

      const result = await manualTestRunModel.reassignExecutor({
        projectId,
        runId,
        executedById: executorId,
      });

      expect(result).toEqual({ ...detail, status });
      expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
      expect(tx.manualTestRun.update).toHaveBeenCalledWith({
        where: { id: runId },
        data: expect.objectContaining({ executedById: executorId, updatedAt: expect.any(Date) }),
      });
      const updateCall = tx.manualTestRun.update.mock.calls[0]?.[0];
      if (!updateCall) throw new Error("Expected executor update call");
      const updateData = (updateCall as unknown as { data: object }).data;
      expect(Object.keys(updateData).sort()).toEqual(["executedById", "updatedAt"]);
    },
  );

  it("rejects an inactive reassignment target without updating the run", async () => {
    const tx = createTransactionClient();
    tx.$queryRaw
      .mockResolvedValueOnce([{ id: runId }])
      .mockResolvedValueOnce([{ id: executorId, status: "suspended" }]);
    transactionMock.mockImplementation(async (callback: unknown) =>
      await (callback as (client: Prisma.TransactionClient) => Promise<unknown>)(
        tx as unknown as Prisma.TransactionClient,
      ),
    );

    await expect(
      manualTestRunModel.reassignExecutor({ projectId, runId, executedById: executorId }),
    ).rejects.toThrow("Executor must be an active user");
    expect(tx.manualTestRun.update).not.toHaveBeenCalled();
  });

  it("rejects a missing reassignment target without updating the run", async () => {
    const tx = createTransactionClient();
    tx.$queryRaw.mockResolvedValueOnce([{ id: runId }]).mockResolvedValueOnce([]);
    transactionMock.mockImplementation(async (callback: unknown) =>
      await (callback as (client: Prisma.TransactionClient) => Promise<unknown>)(
        tx as unknown as Prisma.TransactionClient,
      ),
    );

    await expect(
      manualTestRunModel.reassignExecutor({ projectId, runId, executedById: executorId }),
    ).rejects.toThrow("Executor must be an active user");
    expect(tx.manualTestRun.update).not.toHaveBeenCalled();
  });

  it("does not resolve or update a run outside the requested project", async () => {
    const tx = createTransactionClient();
    tx.$queryRaw.mockResolvedValueOnce([]);
    transactionMock.mockImplementation(async (callback: unknown) =>
      await (callback as (client: Prisma.TransactionClient) => Promise<unknown>)(
        tx as unknown as Prisma.TransactionClient,
      ),
    );

    await expect(
      manualTestRunModel.reassignExecutor({ projectId, runId, executedById: executorId }),
    ).resolves.toBeNull();
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.manualTestRun.update).not.toHaveBeenCalled();
  });

  it("captures a null source label and never resolves it from a later source edit", async () => {
    const tx = createTransactionClient();
    tx.$queryRaw
      .mockResolvedValueOnce([{ id: projectId }])
      .mockResolvedValueOnce([{ id: scenarioId }])
      .mockResolvedValueOnce([{ id: executorId }]);
    tx.testScenario.findFirst.mockResolvedValue({
      id: scenarioId,
      title: "Login",
      scenarioKey: null,
      details: null,
      objective: null,
      preconditions: null,
      testData: null,
      expectedResult: null,
      notes: null,
      steps: [],
    });
    tx.manualTestRun.create.mockResolvedValue({ ...detail, runKey: null, sourceScenarioKey: null });
    transactionMock.mockImplementation(async (callback: unknown) =>
      await (callback as (client: Prisma.TransactionClient) => Promise<unknown>)(tx as unknown as Prisma.TransactionClient),
    );

    await manualTestRunModel.createFromScenario({ projectId, scenarioId, executedById: executorId });

    expect(tx.manualTestRun.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ sourceScenarioKey: null, runKey: null }),
    }));
    expect(tx.testScenario.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({ scenarioKey: true }),
    }));
  });

  it("rejects an invalid passing completion before mutating the run", async () => {
    const tx = createTransactionClient();
    tx.$queryRaw.mockResolvedValue([{ id: runId }]);
    tx.manualTestRun.findUnique
      .mockResolvedValueOnce({ id: runId, status: "in_progress" })
      .mockResolvedValueOnce(detail);
    tx.manualTestRunStep.findMany.mockResolvedValue([
      { status: "not_started" },
    ]);
    transactionMock.mockImplementation(async (callback: unknown) =>
      await (callback as (client: Prisma.TransactionClient) => Promise<unknown>)(
        tx as unknown as Prisma.TransactionClient,
      ),
    );

    await expect(
      manualTestRunModel.complete({
        projectId,
        runId,
        status: "passed",
      }),
    ).rejects.toThrow("A run can be marked passed");
    expect(tx.manualTestRun.update).not.toHaveBeenCalled();
  });

  it("rolls back a submitted key when the same PATCH cannot complete the run", async () => {
    const tx = createTransactionClient();
    tx.$queryRaw.mockResolvedValue([{ id: runId }]);
    tx.manualTestRun.findUnique.mockResolvedValue({ id: runId, status: "in_progress" });
    tx.manualTestRunStep.findMany.mockResolvedValue([{ status: "not_started" }]);
    transactionMock.mockImplementation(async (callback: unknown) =>
      await (callback as (client: Prisma.TransactionClient) => Promise<unknown>)(tx as unknown as Prisma.TransactionClient),
    );

    await expect(manualTestRunModel.updateRun({
      projectId, runId, runKey: "Review", status: "passed", notes: "Done",
    })).rejects.toThrow("A run can be marked passed");
    expect(tx.manualTestRun.update).not.toHaveBeenCalled();
  });

  it("freezes the run with a server completion timestamp after valid completion", async () => {
    const tx = createTransactionClient();
    tx.$queryRaw.mockResolvedValue([{ id: runId }]);
    tx.manualTestRun.findUnique
      .mockResolvedValueOnce({ id: runId, status: "in_progress" })
      .mockResolvedValueOnce({ ...detail, status: "failed" });
    tx.manualTestRunStep.findMany.mockResolvedValue([
      { status: "not_started" },
    ]);
    tx.manualTestRun.update.mockResolvedValue(undefined);
    transactionMock.mockImplementation(async (callback: unknown) =>
      await (callback as (client: Prisma.TransactionClient) => Promise<unknown>)(
        tx as unknown as Prisma.TransactionClient,
      ),
    );

    await manualTestRunModel.complete({
      projectId,
      runId,
      status: "failed",
      notes: null,
    });

    expect(tx.manualTestRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: runId },
        data: expect.objectContaining({
          status: "failed",
          completedAt: expect.any(Date),
          notes: null,
        }),
      }),
    );
  });

  it("allows completed-run label-only edits while preserving execution fields", async () => {
    const tx = createTransactionClient();
    tx.$queryRaw.mockResolvedValue([{ id: runId }]);
    tx.manualTestRun.findUnique.mockResolvedValue({ id: runId, status: "passed" });
    tx.manualTestRun.findFirst.mockResolvedValue({ ...detail, status: "passed", runKey: "Review" });
    transactionMock.mockImplementation(async (callback: unknown) =>
      await (callback as (client: Prisma.TransactionClient) => Promise<unknown>)(tx as unknown as Prisma.TransactionClient),
    );

    await manualTestRunModel.updateRun({ projectId, runId, runKey: "Review" });

    expect(tx.manualTestRun.update).toHaveBeenCalledWith({
      where: { id: runId },
      data: { runKey: "Review", updatedAt: expect.any(Date) },
    });
  });

  it("returns the captured source label without reading the current source", async () => {
    const tx = createTransactionClient();
    tx.manualTestRun.findFirst.mockResolvedValue({ ...detail, sourceScenarioKey: "R1" });
    transactionMock.mockImplementation(async (callback: unknown) =>
      await (callback as (client: Prisma.TransactionClient) => Promise<unknown>)(tx as unknown as Prisma.TransactionClient),
    );

    const result = await manualTestRunModel.findById(runId, projectId);

    expect(result?.sourceScenarioKey).toBe("R1");
    expect(tx.testScenario.findFirst).not.toHaveBeenCalled();
  });

  it("rejects completed-run label edits combined with execution fields atomically", async () => {
    const tx = createTransactionClient();
    tx.$queryRaw.mockResolvedValue([{ id: runId }]);
    tx.manualTestRun.findUnique.mockResolvedValue({ id: runId, status: "passed" });
    transactionMock.mockImplementation(async (callback: unknown) =>
      await (callback as (client: Prisma.TransactionClient) => Promise<unknown>)(tx as unknown as Prisma.TransactionClient),
    );

    await expect(manualTestRunModel.updateRun({ projectId, runId, runKey: "Review", notes: null })).rejects.toThrow("immutable");
    expect(tx.manualTestRun.update).not.toHaveBeenCalled();
  });

  it("filters history by the captured label using the same predicate for rows and count", async () => {
    const tx = createTransactionClient();
    tx.project.findUnique.mockResolvedValue({ id: projectId });
    tx.manualTestRun.findMany.mockResolvedValue([]);
    tx.manualTestRun.count.mockResolvedValue(0);
    transactionMock.mockImplementation(async (callback: unknown) =>
      await (callback as (client: Prisma.TransactionClient) => Promise<unknown>)(tx as unknown as Prisma.TransactionClient),
    );

    await manualTestRunModel.findHistory({ projectId, sourceScenarioKey: "R1", status: "passed" });

    const expectedWhere = { projectId, sourceScenarioKey: "R1", status: "passed" };
    expect(tx.manualTestRun.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expectedWhere }));
    expect(tx.manualTestRun.count).toHaveBeenCalledWith({ where: expectedWhere });
  });

  it("combines case-preserved key, UUID, status, and date predicates before pagination", async () => {
    const tx = createTransactionClient();
    tx.project.findUnique.mockResolvedValue({ id: projectId });
    tx.manualTestRun.findMany.mockResolvedValue([]);
    tx.manualTestRun.count.mockResolvedValue(0);
    transactionMock.mockImplementation(async (callback: unknown) =>
      await (callback as (client: Prisma.TransactionClient) => Promise<unknown>)(tx as unknown as Prisma.TransactionClient),
    );
    const startedFrom = "2026-01-01T00:00:00Z";
    const startedBefore = "2026-02-01T00:00:00Z";

    await manualTestRunModel.findHistory({
      projectId, sourceScenarioKey: "r1", testScenarioId: scenarioId,
      status: "passed", startedFrom, startedBefore, page: 2, limit: 10,
    });

    const where = {
      projectId,
      sourceTestScenarioId: scenarioId,
      sourceScenarioKey: "r1",
      status: "passed",
      startedAt: { gte: new Date(startedFrom), lt: new Date(startedBefore) },
    };
    expect(tx.manualTestRun.findMany).toHaveBeenCalledWith(expect.objectContaining({ where, skip: 10, take: 10 }));
    expect(tx.manualTestRun.count).toHaveBeenCalledWith({ where });
    expect(tx.testScenario.findFirst).not.toHaveBeenCalled();
  });

  it("does not update a run label outside the requested project", async () => {
    const tx = createTransactionClient();
    tx.$queryRaw.mockResolvedValue([]);
    transactionMock.mockImplementation(async (callback: unknown) =>
      await (callback as (client: Prisma.TransactionClient) => Promise<unknown>)(tx as unknown as Prisma.TransactionClient),
    );

    await expect(manualTestRunModel.updateRun({ projectId, runId, runKey: "R2" })).resolves.toBeNull();
    expect(tx.manualTestRun.update).not.toHaveBeenCalled();
  });
});
