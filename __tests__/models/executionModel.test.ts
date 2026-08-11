// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";

const findManyMock = jest.fn();

jest.mock("@/prisma/client", () => ({
  dbClient: {
    execution: {
      findMany: findManyMock,
    },
  },
}));

import { executionModel } from "@/models/executionModel";

describe("executionModel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("findDistinctTypes", () => {
    it("selects distinct execution types for one project", async () => {
      findManyMock.mockResolvedValue([
        { type: "Nightly" },
        { type: "Release" },
      ] as never);

      await expect(
        executionModel.findDistinctTypes("project-1"),
      ).resolves.toEqual(["Nightly", "Release"]);
      expect(findManyMock).toHaveBeenCalledWith({
        where: { projectId: "project-1" },
        select: { type: true },
        distinct: ["type"],
      });
    });
  });
});
