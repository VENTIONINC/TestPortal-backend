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
});
