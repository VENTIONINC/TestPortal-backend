// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";

const findManyMock: jest.Mock = jest.fn();
const countMock: jest.Mock = jest.fn();
const specFindManyMock: jest.Mock = jest.fn();

jest.mock("@/prisma/client", () => ({
  dbClient: {
    result: {
      findMany: findManyMock,
      count: countMock,
    },
    spec: {
      findMany: specFindManyMock,
    },
  },
}));

import { resultModel } from "@/models/resultModel";

describe("resultModel filtering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (
      findManyMock.mockResolvedValue as unknown as (value: unknown[]) => void
    )([]);
    (countMock.mockResolvedValue as unknown as (value: number) => void)(0);
    (
      specFindManyMock.mockResolvedValue as unknown as (
        value: Array<{ tags: unknown }>,
      ) => void
    )([]);
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

  it("matches any selected tag in findMany", async () => {
    await resultModel.findMany(
      {
        projectId: "project-1",
        tag: "L1, L2,L1,,",
      },
      1,
      25,
    );

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          spec: {
            projectId: "project-1",
            OR: [
              { tags: { array_contains: ["L1"] } },
              { tags: { array_contains: ["L2"] } },
            ],
          },
        }),
      }),
    );
  });

  it("matches any selected tag in count", async () => {
    await resultModel.count({
      projectId: "project-1",
      tag: "L1,L2",
    });

    expect(countMock).toHaveBeenCalledWith({
      where: expect.objectContaining({
        spec: {
          projectId: "project-1",
          OR: [
            { tags: { array_contains: ["L1"] } },
            { tags: { array_contains: ["L2"] } },
          ],
        },
      }),
    });
  });

  it("limits raw results to the supplied spec record IDs", async () => {
    await resultModel.findMany({
      projectId: "project-1",
      from: "2026-07-01",
      to: "2026-07-07",
      specRecordIds: ["spec-1", "spec-2"],
    });

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          spec: expect.objectContaining({
            projectId: "project-1",
            id: { in: ["spec-1", "spec-2"] },
          }),
          startTime: {
            gte: new Date("2026-07-01T00:00:00.000Z"),
            lte: new Date("2026-07-08T00:00:00.000Z"),
          },
        }),
      }),
    );
  });

  it("limits findMany to each selected calendar day", async () => {
    await resultModel.findMany({
      projectId: "project-1",
      from: "2026-07-01",
      to: "2026-07-07",
      dates: ["2026-07-02", "2026-07-04"],
    });

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            {
              OR: [
                {
                  startTime: {
                    gte: new Date("2026-07-02T00:00:00.000Z"),
                    lt: new Date("2026-07-03T00:00:00.000Z"),
                  },
                },
                {
                  startTime: {
                    gte: new Date("2026-07-04T00:00:00.000Z"),
                    lt: new Date("2026-07-05T00:00:00.000Z"),
                  },
                },
              ],
            },
          ]),
        }),
      }),
    );
  });

  it("applies selected calendar days to count", async () => {
    await resultModel.count({
      projectId: "project-1",
      dates: ["2026-07-02"],
    });

    expect(countMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            {
              OR: [
                {
                  startTime: {
                    gte: new Date("2026-07-02T00:00:00.000Z"),
                    lt: new Date("2026-07-03T00:00:00.000Z"),
                  },
                },
              ],
            },
          ]),
        }),
      }),
    );
  });

  it("selects tags from matching specs without loading matching results", async () => {
    await resultModel.findSpecTags({
      projectId: "project-1",
      status: "failed",
      dates: ["2026-07-02"],
    });

    expect(specFindManyMock).toHaveBeenCalledWith({
      where: {
        projectId: "project-1",
        results: {
          some: expect.objectContaining({
            status: "failed",
            AND: expect.arrayContaining([
              {
                OR: [
                  {
                    startTime: {
                      gte: new Date("2026-07-02T00:00:00.000Z"),
                      lt: new Date("2026-07-03T00:00:00.000Z"),
                    },
                  },
                ],
              },
            ]),
          }),
        },
      },
      select: {
        tags: true,
      },
    });
    expect(findManyMock).not.toHaveBeenCalled();
  });
});
