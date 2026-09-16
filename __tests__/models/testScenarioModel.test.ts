// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import type { Prisma, TestScenario, TestScenarioStep } from "@prisma/client";

const projectFindUniqueMock = jest.fn<() => Promise<unknown>>();
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
const queryRawMock = jest.fn<() => Promise<unknown>>();
const transactionMock = jest.fn<(callback: unknown) => Promise<unknown>>();

const tx = {
  project: { findUnique: projectFindUniqueMock },
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
  createdById: "33333333-3333-3333-3333-333333333333",
  title: "Login",
  details: null,
  objective: "Verify login",
  preconditions: null,
  testData: null,
  expectedResult: null,
  notes: null,
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
      data: [{
        testScenarioId: scenario.id,
        position: 0,
        action: step.action,
        expectedResult: null,
      }],
    });
    expect(result?.steps[0]?.id).toBe(step.id);
  });

  it("keeps summary selection lightweight", async () => {
    await testScenarioModel.findManySummaries(scenario.projectId, 2, 10);
    expect(summaryFindManyMock).toHaveBeenCalledWith(expect.objectContaining({
      where: { projectId: scenario.projectId },
      skip: 10,
      take: 10,
    }));
    const selection = (summaryFindManyMock.mock.calls[0]?.[0] as { select?: Record<string, unknown> } | undefined)?.select;
    expect(selection).not.toHaveProperty("contentMd");
    expect(selection).not.toHaveProperty("steps");
  });

  it("locks the parent before updating fields and regenerates the projection", async () => {
    const result = await testScenarioModel.update(
      scenario.id,
      scenario.projectId,
      { notes: "Updated" },
    );
    expect(queryRawMock).toHaveBeenCalled();
    expect(scenarioUpdateMock).toHaveBeenCalledWith({
      where: { id: scenario.id },
      data: { notes: "Updated" },
    });
    expect(result?.contentMdHash).toHaveLength(64);
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
