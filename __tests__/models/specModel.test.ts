// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";

const findMany = jest.fn();
const count = jest.fn();
jest.mock("@/prisma/client", () => ({
  dbClient: { spec: { findMany, count } },
}));

import { specModel } from "@/models/specModel";

describe("Spec listing queries", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shares project and literal search predicates between the page and count", async () => {
    findMany.mockResolvedValue([] as never);
    count.mockResolvedValue(0 as never);
    const filter = { projectId: "project-1", search: "  A%_\\B  " };
    await specModel.list(filter, 2, 10);
    await specModel.count(filter);
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
  });

  it("omits a blank search while retaining project scope", async () => {
    findMany.mockResolvedValue([] as never);
    await specModel.list({ projectId: "project-2", search: "  " }, 1, 30);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { projectId: "project-2" } }),
    );
  });
});
