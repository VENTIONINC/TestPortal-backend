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

describe("resultModel filtering", () => {
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
});

describe("resultModel issue statistics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("aggregates by issue ID and distinct linked result with derived summaries", async () => {
    const issueA = { id: "issue-a", name: "Duplicate name" };
    const issueB = { id: "issue-b", name: "Duplicate name" };
    const issueC = { id: "issue-c", name: "Dominant mixed" };
    const issueD = { id: "issue-d", name: "Uncategorized" };
    const makeResult = (
      id: string,
      analysisCategory: string | null,
      analysisFeedbackCategory: string | null,
      assumptions: Array<{ id: string; issue: typeof issueA }>,
    ) => ({
      id,
      status: "failed",
      startTime: new Date("2026-07-28T10:00:00.000Z"),
      analysisCategory,
      analysisFeedbackCategory,
      spec: {
        id: `spec-${id}`,
        key: id,
        title: id,
        file: `${id}.ts`,
        tags: [],
      },
      execution: {
        id: `execution-${id}`,
        environment: "test",
        type: "e2e",
      },
      errors: [
        {
          id: `error-${id}`,
          message: "Failure",
          assumptions,
        },
      ],
    });
    const results = [
      makeResult("result-1", "bug", null, [
        { id: "a-1", issue: issueA },
        { id: "a-2", issue: issueA },
        { id: "b-1", issue: issueB },
        { id: "c-1", issue: issueC },
      ]),
      makeResult("result-2", "bug", "script", [
        { id: "a-3", issue: issueA },
        { id: "c-2", issue: issueC },
      ]),
      makeResult("result-3", null, null, [
        { id: "d-1", issue: issueD },
      ]),
      makeResult("result-4", "SCRIPT", null, [
        { id: "c-3", issue: issueC },
      ]),
    ];
    (
      findManyMock.mockResolvedValue as unknown as (value: unknown[]) => void
    )(results);

    const stats = await resultModel.getStats({ projectId: "project-1" });
    const topA = stats.topIssues.find((issue) => issue.id === issueA.id);
    const topB = stats.topIssues.find((issue) => issue.id === issueB.id);
    const topC = stats.topIssues.find((issue) => issue.id === issueC.id);
    const topD = stats.topIssues.find((issue) => issue.id === issueD.id);

    expect(topA).toMatchObject({
      title: "Duplicate name",
      count: 2,
      categorySummary: {
        displayCategory: null,
        isMixed: true,
        distribution: { bug: 1, infra: 0, performance: 0, script: 1, other: 0 },
        uncategorizedCount: 0,
      },
    });
    expect(topB).toMatchObject({
      title: "Duplicate name",
      count: 1,
      categorySummary: {
        displayCategory: "bug",
        isMixed: false,
      },
    });
    expect(topC).toMatchObject({
      count: 3,
      categorySummary: {
        displayCategory: "script",
        isMixed: true,
        distribution: { bug: 1, infra: 0, performance: 0, script: 2, other: 0 },
      },
    });
    expect(topD).toMatchObject({
      count: 1,
      categorySummary: {
        displayCategory: null,
        isMixed: false,
        uncategorizedCount: 1,
      },
    });

    for (const issue of stats.topIssues) {
      const categorizedTotal = Object.values(
        issue.categorySummary.distribution,
      ).reduce((sum, count) => sum + count, 0);
      expect(issue.count).toBe(
        categorizedTotal + issue.categorySummary.uncategorizedCount,
      );
    }
  });
});
