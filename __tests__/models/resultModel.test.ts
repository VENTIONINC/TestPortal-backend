// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";

const findManyMock: jest.Mock = jest.fn();
const countMock: jest.Mock = jest.fn();

jest.mock("@/prisma/client", () => ({
  dbClient: {
    result: {
      findMany: findManyMock,
      count: countMock,
    },
  },
}));

import { resultModel } from "@/models/resultModel";

describe("resultModel tag filtering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (
      findManyMock.mockResolvedValue as unknown as (value: unknown[]) => void
    )([]);
    (countMock.mockResolvedValue as unknown as (value: number) => void)(0);
  });

  it("uses exact JSON array membership for findMany tag filtering", async () => {
    await resultModel.findMany(
      {
        projectId: "project-1",
        tag: "smoke",
      },
      1,
      25,
    );

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          spec: expect.objectContaining({
            projectId: "project-1",
            tags: {
              array_contains: ["smoke"],
            },
          }),
        }),
      }),
    );
  });

  it("uses exact JSON array membership for count tag filtering", async () => {
    await resultModel.count({
      projectId: "project-1",
      tag: "smoke",
    });

    expect(countMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          spec: expect.objectContaining({
            projectId: "project-1",
            tags: {
              array_contains: ["smoke"],
            },
          }),
        }),
      }),
    );
  });
});
