// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";

const transactionMock: jest.Mock = jest.fn();

function mockResolved<T>(value: T): jest.Mock {
  const mock = jest.fn();
  (mock.mockResolvedValue as unknown as (resolvedValue: T) => jest.Mock)(value);
  return mock;
}

jest.mock("@/prisma/client", () => ({
  dbClient: {
    $transaction: transactionMock,
  },
}));

import { projectModel } from "@/models/projectModel";

describe("projectModel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("deleteWithCascade", () => {
    it("deletes daily execution metrics before deleting the project", async () => {
      const projectId = "11111111-1111-1111-1111-111111111111";
      const deletedProject = {
        id: projectId,
        name: "Project",
      };
      const mockTxClient = {
        project: {
          findUnique: mockResolved({ id: projectId }),
          delete: mockResolved(deletedProject),
        },
        execution: {
          findMany: mockResolved([]),
          deleteMany: mockResolved({ count: 0 }),
        },
        spec: {
          findMany: mockResolved([]),
          deleteMany: mockResolved({ count: 0 }),
        },
        issue: {
          findMany: mockResolved([]),
          deleteMany: mockResolved({ count: 0 }),
        },
        result: {
          findMany: mockResolved([]),
          deleteMany: mockResolved({ count: 0 }),
        },
        resultError: {
          findMany: mockResolved([]),
          deleteMany: mockResolved({ count: 0 }),
        },
        assumption: {
          deleteMany: mockResolved({ count: 0 }),
        },
        dailyExecutionMetric: {
          deleteMany: mockResolved({ count: 1 }),
        },
        uploadApiKey: {
          deleteMany: mockResolved({ count: 0 }),
        },
      };

      type TransactionCallback = (
        tx: typeof mockTxClient,
      ) => Promise<unknown>;

      transactionMock.mockImplementation(async (callback: unknown) => {
        return await (callback as TransactionCallback)(mockTxClient);
      });

      const result = await projectModel.deleteWithCascade(projectId);

      expect(result).toBe(deletedProject);
      expect(mockTxClient.dailyExecutionMetric.deleteMany).toHaveBeenCalledWith({
        where: { projectId },
      });
      const dailyMetricsDeleteOrder =
        mockTxClient.dailyExecutionMetric.deleteMany.mock
          .invocationCallOrder[0];
      const projectDeleteOrder =
        mockTxClient.project.delete.mock.invocationCallOrder[0];

      expect(dailyMetricsDeleteOrder).toEqual(expect.any(Number));
      expect(projectDeleteOrder).toEqual(expect.any(Number));

      if (
        dailyMetricsDeleteOrder === undefined ||
        projectDeleteOrder === undefined
      ) {
        throw new Error("Expected delete calls to be recorded");
      }

      expect(dailyMetricsDeleteOrder).toBeLessThan(projectDeleteOrder);
      expect(mockTxClient.project.delete).toHaveBeenCalledWith({
        where: { id: projectId },
      });
    });
  });
});
