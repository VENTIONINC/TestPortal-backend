// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";

const findMany = jest.fn();
const count = jest.fn();
const transaction = jest.fn((queries: Promise<unknown>[]) =>
  Promise.all(queries),
);
jest.mock("@/prisma/client", () => ({
  dbClient: { spec: { findMany, count }, $transaction: transaction },
}));

import { specModel } from "@/models/specModel";

describe("Spec listing queries", () => {
  beforeEach(() => jest.clearAllMocks());

  it("reads the page and count with the same predicate and transaction snapshot", async () => {
    findMany.mockResolvedValue([] as never);
    count.mockResolvedValue(0 as never);

    const filter = { projectId: "project-1", search: "  A%_\\B  " };
    await expect(specModel.listPage(filter, 2, 10)).resolves.toEqual({
      specs: [],
      total: 0,
    });

    const where = {
      projectId: "project-1",
      OR: ["key", "title", "file"].map((field) => ({
        [field]: { contains: "A\\%\\_\\\\B", mode: "insensitive" },
      })),
    };
    expect(findMany).toHaveBeenCalledWith({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: 10,
      take: 10,
    });
    expect(count).toHaveBeenCalledWith({ where });
    expect(transaction).toHaveBeenCalledWith(
      [findMany.mock.results[0]?.value, count.mock.results[0]?.value],
      { isolationLevel: "RepeatableRead" },
    );
  });

  it("omits a blank search while retaining project scope", async () => {
    findMany.mockResolvedValue([] as never);
    count.mockResolvedValue(0 as never);
    await specModel.listPage({ projectId: "project-2", search: "  " }, 1, 30);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { projectId: "project-2" } }),
    );
  });
});
