// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";

// Mock the prisma client to prevent Prisma from initializing during tests
jest.mock("@/prisma/client", () => ({
  dbClient: {
    resultError: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    assumption: { findFirst: jest.fn(), create: jest.fn() },
  },
}));

import {
  calculateErrorSimilarity,
  compareStackTraces,
  runReview,
} from "@/lib/error-analyzer";
import { dbClient } from "@/prisma/client";
import {
  makeError,
  makeAssumption,
  similarityCases,
  type ErrorFixture,
} from "../fixtures/errorSimilarity";

describe("calculateErrorSimilarity", () => {
  it("returns 1 for very similar messages", () => {
    const m1 = "TypeError: Variable undefined at line 3";
    const m2 = "TypeError: Variable undefined at line 42";
    const score = calculateErrorSimilarity(m1, m2);
    expect(score).toBeCloseTo(1, 5);
  });

  it("returns lower score for different messages", () => {
    const score = calculateErrorSimilarity("Error: foo", "Warning: bar");
    expect(score).toBeLessThan(0.5);
  });
});

describe("compareStackTraces", () => {
  it("returns 1 when stacks are equivalent ignoring line numbers", () => {
    const stack1 = [
      "at /app/file1.ts:10:2",
      "at /app/file2.ts:20:4",
      "at /app/file3.ts:30:6",
    ];
    const stack2 = [
      "at /app/file1.ts:12:8",
      "at /app/file2.ts:22:1",
      "at /app/file3.ts:32:9",
    ];
    const score = compareStackTraces(stack1, stack2);
    expect(score).toBeCloseTo(1, 5);
  });

  it("returns a low score for completely different stacks", () => {
    const score = compareStackTraces(["at /x.ts:1:1"], ["at /y.ts:2:2"]);
    expect(score).toBeLessThan(0.3);
  });
});

// Characterization tests: these document existing behavior, including limitations.
// They are a baseline for a future algorithm, not an endorsement of known defects.
describe("runReview — current algorithm", () => {
  const findMany = jest.mocked(dbClient.resultError.findMany);
  const findUnique = jest.mocked(dbClient.resultError.findUnique);
  const update = jest.mocked(dbClient.resultError.update);
  const findFirst = jest.mocked(dbClient.assumption.findFirst);
  const create = jest.mocked(dbClient.assumption.create);
  let target: ErrorFixture;
  let candidate: ErrorFixture;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    target = makeError();
    candidate = makeError({ id: "error-old", assumptions: [makeAssumption()] });
    // Prisma's generic mock signatures omit included relations; keep fixtures typed
    // with ResultErrorWithRelations so runReview receives realistic relation data.
    findMany.mockResolvedValue([candidate]);
    findUnique.mockResolvedValue(target);
    findFirst.mockResolvedValue(null);
    create.mockResolvedValue(makeAssumption({ id: "assumption-new" }));
    update.mockResolvedValue(target);
  });

  afterEach(() => jest.restoreAllMocks());

  it("requests the latest 100 errors of the same type with assumptions (currently unscoped)", async () => {
    await runReview(target);
    expect(findMany).toHaveBeenCalledWith({
      where: { type: target.type, assumptions: { some: {} } },
      include: { assumptions: { include: { issue: true } }, result: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  });

  it("creates an unconfirmed bot suggestion for an identical error and returns refreshed relations", async () => {
    const refreshed = makeError({
      assumptions: [makeAssumption({ id: "assumption-new" })],
    });
    findUnique.mockResolvedValue(refreshed);
    await expect(runReview(target)).resolves.toEqual(refreshed);
    expect(create).toHaveBeenCalledWith({
      data: {
        isConfirmed: false,
        score: 1,
        madeBy: "bot",
        issue: { connect: { id: "issue-old" } },
        resultError: { connect: { id: target.id } },
      },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: target.id },
      data: { assumptions: { connect: { id: "assumption-new" } } },
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: target.id },
      include: { result: true, assumptions: { include: { issue: true } } },
    });
  });

  it("does not write when there are no candidates", async () => {
    findMany.mockResolvedValue([]);
    await expect(runReview(target)).resolves.toEqual(target);
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects an identical message without logs or stack (only 0.4)", async () => {
    target.callLog = [];
    target.callStack = [];
    await runReview(target);
    expect(findFirst).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it.each(["callLog", "callStack"] as const)(
    "accepts the exact 0.7 boundary with %s missing",
    async (field) => {
      target[field] = [];
      await runReview(target);
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ score: 0.7 }),
        }),
      );
    },
  );

  it("rejects different messages even with identical logs and stacks (0.6)", async () => {
    target.message = "aaaa";
    candidate.message = "zzzz";
    await runReview(target);
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("skips a length difference above 50% even when normalized messages match", async () => {
    target.message = "Error 1";
    candidate.message = "Error 123456789012345";
    expect(calculateErrorSimilarity(target.message, candidate.message)).toBe(1);
    await runReview(target);
    expect(create).not.toHaveBeenCalled();
  });

  it("accepts a length difference of exactly 50%", async () => {
    target.message = "Error 12";
    candidate.message = "Error 123456";
    await runReview(target);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("supports legacy JSON strings for logs and stacks on both sides", async () => {
    target.callLog = JSON.stringify(target.callLog);
    target.callStack = JSON.stringify(target.callStack);
    candidate.callLog = JSON.stringify(candidate.callLog);
    candidate.callStack = JSON.stringify(candidate.callStack);
    await runReview(target);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ score: 1 }),
      }),
    );
  });

  it("continues past a rejected candidate", async () => {
    findMany.mockResolvedValue([makeError({ message: "x" }), candidate]);
    await runReview(target);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("selects the first passing candidate even if a later one scores higher", async () => {
    const first = makeError({
      id: "first",
      callLog: [],
      assumptions: [makeAssumption({ issueId: "first-issue" })],
    });
    findMany.mockResolvedValue([first, candidate]);
    await runReview(target);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          score: 0.7,
          issue: { connect: { id: "first-issue" } },
        }),
      }),
    );
  });

  it("prefers a confirmed assumption over an unconfirmed one", async () => {
    candidate.assumptions = [
      makeAssumption({
        isConfirmed: false,
        issueId: "unconfirmed",
        score: 0.1,
      }),
      makeAssumption({ issueId: "confirmed", score: 0.9 }),
    ];
    await runReview(target);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          issue: { connect: { id: "confirmed" } },
        }),
      }),
    );
  });

  it("currently propagates the lowest-score assumption when none are confirmed", async () => {
    candidate.assumptions = [
      makeAssumption({ isConfirmed: false, issueId: "high", score: 0.9 }),
      makeAssumption({ isConfirmed: false, issueId: "low", score: 0.2 }),
    ];
    await runReview(target);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          issue: { connect: { id: "low" } },
        }),
      }),
    );
  });

  it("reuses an existing target assumption without creating or replacing it", async () => {
    findFirst.mockResolvedValue(
      makeAssumption({ id: "existing", issueId: "different-issue" }),
    );
    await runReview(target);
    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      where: { id: target.id },
      data: { assumptions: { connect: { id: "existing" } } },
    });
  });

  it("propagates a candidate lookup failure without writing a suggestion", async () => {
    findMany.mockRejectedValue(new Error("Database unavailable"));
    await expect(runReview(target)).rejects.toThrow("Database unavailable");
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it.each(similarityCases)(
    "shared comparison baseline: $id",
    async (testCase) => {
      const pair = testCase.makePair();
      findMany.mockResolvedValue([pair.candidate]);
      findUnique.mockResolvedValue(pair.target);
      await runReview(pair.target);
      expect(create.mock.calls.length > 0).toBe(testCase.legacyMatch);
    },
  );

  it.todo("restricts candidates to the target project (known missing filter)");
});

describe("similarity limitations — baseline", () => {
  it.each([
    ["", "error"],
    ["error", ""],
    ["", ""],
  ])("returns zero for empty messages: %j / %j", (a, b) => {
    expect(calculateErrorSimilarity(a, b)).toBe(0);
  });

  it("currently discards meaningful HTTP status codes", () => {
    expect(
      calculateErrorSimilarity(
        "HTTP 401 Unauthorized",
        "HTTP 500 Unauthorized",
      ),
    ).toBe(1);
  });

  it.each([
    [[], []],
    [[], ["frame"]],
    [["frame"], []],
  ])("returns zero when a stack is missing: %j / %j", (a, b) => {
    expect(compareStackTraces(a, b)).toBe(0);
  });
});
