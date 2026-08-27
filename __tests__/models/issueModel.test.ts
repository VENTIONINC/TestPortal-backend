// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";

const findManyMock = jest.fn();
const countMock = jest.fn();

jest.mock("@/prisma/client", () => ({
  dbClient: {
    issue: {
      findMany: findManyMock,
      count: countMock,
    },
  },
}));

import { issueModel } from "@/models/issueModel";

const occurrenceFilter = {
  assumptions: {
    some: {
      resultError: {
        result: {
          execution: {
            type: "Release",
          },
        },
      },
    },
  },
};

describe("issueModel execution-type filtering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findManyMock.mockResolvedValue([] as never);
    countMock.mockResolvedValue(0 as never);
  });

  it("filters and paginates issues that have matching execution occurrences", async () => {
    await issueModel.findManyWithUsers(
      "project-1",
      undefined,
      undefined,
      2,
      10,
      "Release",
    );

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: "project-1", ...occurrenceFilter },
        skip: 10,
        take: 10,
      }),
    );
  });

  it("counts only issues that have matching execution occurrences", async () => {
    await issueModel.count("project-1", undefined, undefined, "Release");

    expect(countMock).toHaveBeenCalledWith({
      where: { projectId: "project-1", ...occurrenceFilter },
    });
  });

  it("does not add an occurrence predicate when type is omitted", async () => {
    await issueModel.findManyWithUsers("project-1");

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { projectId: "project-1" } }),
    );
  });

  it("filters by the persisted issue category", async () => {
    await issueModel.findManyWithUsers("project-1", "script", "Login", 1, 5);

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId: "project-1",
          category: "script",
          name: { contains: "Login" },
        },
      }),
    );
  });
});
