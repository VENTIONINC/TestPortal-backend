// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0
import { Prisma } from "@prisma/client";
import { dbClient } from "@/prisma/client";
import {
  ScenarioTransactionRetryError,
  withScenarioTransaction,
} from "@/models/testScenarioTransactions";
jest.mock("@/prisma/client", () => ({ dbClient: { $transaction: jest.fn() } }));
const transaction = jest.mocked(dbClient.$transaction);
beforeEach(() => transaction.mockReset());
it.each(["P2034", "40001", "40P01", "discovery"])(
  "retries only failed transactions for %s, at most five retries",
  async (code) => {
    const error =
      code === "discovery"
        ? new ScenarioTransactionRetryError()
        : new Prisma.PrismaClientKnownRequestError("conflict", {
            code: code === "P2034" ? code : "P2010",
            clientVersion: "test",
            meta: { code },
          });
    transaction.mockRejectedValue(error);
    await expect(withScenarioTransaction(async () => "unused")).rejects.toBe(
      error,
    );
    expect(transaction).toHaveBeenCalledTimes(6);
  },
);
it.each(["P2002", "validation", "stale revision"])(
  "does not replay %s",
  async (code) => {
    const error =
      code === "P2002"
        ? new Prisma.PrismaClientKnownRequestError("name conflict", {
            code,
            clientVersion: "test",
          })
        : new Error(code);
    transaction.mockRejectedValue(error);
    await expect(withScenarioTransaction(async () => "unused")).rejects.toBe(
      error,
    );
    expect(transaction).toHaveBeenCalledTimes(1);
  },
);
it("defaults discovery writes to Serializable and permits allocation's explicit ReadCommitted", async () => {
  transaction.mockResolvedValue("committed");
  const callback = async () => "committed";
  await withScenarioTransaction(callback);
  expect(transaction).toHaveBeenLastCalledWith(callback, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
  await withScenarioTransaction(
    callback,
    Prisma.TransactionIsolationLevel.ReadCommitted,
  );
  expect(transaction).toHaveBeenLastCalledWith(callback, {
    isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  });
});
