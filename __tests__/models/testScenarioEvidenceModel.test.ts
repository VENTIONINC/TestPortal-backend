// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";

const resultFindManyMock = jest.fn<() => Promise<unknown>>();
const resultCountMock = jest.fn<() => Promise<unknown>>();
const issueFindManyMock = jest.fn<() => Promise<unknown>>();
const issueCountMock = jest.fn<() => Promise<unknown>>();

jest.mock("@/prisma/client", () => ({
  dbClient: {
    result: {
      findMany: resultFindManyMock,
      count: resultCountMock,
    },
    issue: {
      findMany: issueFindManyMock,
      count: issueCountMock,
    },
  },
}));

import { issueModel } from "@/models/issueModel";
import { resultModel } from "@/models/resultModel";

describe("scenario evidence model predicates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resultFindManyMock.mockResolvedValue([]);
    resultCountMock.mockResolvedValue(0);
    issueFindManyMock.mockResolvedValue([]);
    issueCountMock.mockResolvedValue(0);
  });

  it("queries Results by database Spec IDs and both project relations", async () => {
    await resultModel.findManyBySpecRecordIds(
      ["spec-1", "spec-2"],
      "project-1",
      2,
      5,
    );
    await resultModel.countBySpecRecordIds(
      ["spec-1", "spec-2"],
      "project-1",
    );

    expect(resultFindManyMock).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        spec: { id: { in: ["spec-1", "spec-2"] }, projectId: "project-1" },
        execution: { projectId: "project-1" },
      },
      skip: 5,
      take: 5,
      orderBy: [{ startTime: "desc" }, { id: "desc" }],
    }));
    expect(resultCountMock).toHaveBeenCalledWith({
      where: {
        spec: { id: { in: ["spec-1", "spec-2"] }, projectId: "project-1" },
        execution: { projectId: "project-1" },
      },
    });
  });

  it("queries unique Issues through Assumption to Result evidence without confirmation filtering", async () => {
    await issueModel.findObservedBySpecRecordIds(
      ["spec-1"],
      "project-1",
      1,
      30,
    );
    await issueModel.countObservedBySpecRecordIds(["spec-1"], "project-1");

    const expectedEvidence = {
      projectId: "project-1",
      assumptions: {
        some: {
          resultError: {
            result: {
              spec: { id: { in: ["spec-1"] }, projectId: "project-1" },
              execution: { projectId: "project-1" },
            },
          },
        },
      },
    };
    expect(issueFindManyMock).toHaveBeenCalledWith(expect.objectContaining({
      where: expectedEvidence,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }));
    expect(issueCountMock).toHaveBeenCalledWith({ where: expectedEvidence });
    const issueQuery = (issueFindManyMock.mock.calls as unknown[][])[0]?.[0];
    expect(JSON.stringify(issueQuery)).not.toContain("isConfirmed");
  });

  it("does not query the database for empty linked Spec ID sets", async () => {
    await expect(
      resultModel.findManyBySpecRecordIds([], "project-1"),
    ).resolves.toEqual([]);
    await expect(
      resultModel.countBySpecRecordIds([], "project-1"),
    ).resolves.toBe(0);
    await expect(
      issueModel.findObservedBySpecRecordIds([], "project-1"),
    ).resolves.toEqual([]);
    await expect(
      issueModel.countObservedBySpecRecordIds([], "project-1"),
    ).resolves.toBe(0);

    expect(resultFindManyMock).not.toHaveBeenCalled();
    expect(resultCountMock).not.toHaveBeenCalled();
    expect(issueFindManyMock).not.toHaveBeenCalled();
    expect(issueCountMock).not.toHaveBeenCalled();
  });
});
