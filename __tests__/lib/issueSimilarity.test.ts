// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import * as errorAnalyzer from "@/lib/error-analyzer";

jest.mock("@/prisma/client", () => ({ dbClient: {} }));

type Evidence = {
  message?: string | null;
  callStack?: string[] | null;
  specPath?: string | null;
};

type Candidate = {
  issueId: string;
  issue: { id: string; name: string };
  evidence: Evidence[];
};

const getScorer = () => Reflect.get(errorAnalyzer, "scoreIssueSimilarity");
const getSelector = () =>
  Reflect.get(errorAnalyzer, "selectBestIssueSuggestion");

describe("issue similarity scoring", () => {
  const target: Evidence = {
    message: "Timeout waiting for checkout submit button",
    callStack: [
      "at CheckoutPage.submit (/tests/checkout.ts:42:7)",
      "at checkout (/tests/checkout.spec.ts:18:3)",
    ],
    specPath: "/tests/checkout.spec.ts",
  };

  it("scores normalized message text deterministically", () => {
    const score = getScorer();
    expect(score).toEqual(expect.any(Function));
    if (typeof score !== "function") return;

    const candidate = {
      ...target,
      message: "timeout  waiting for CHECKOUT submit button!",
    };
    const result = score(target, candidate);
    expect(result).not.toBeNull();
    expect(result).toEqual(score(target, candidate));
    expect(result?.signals.message).toBeGreaterThan(0.9);
  });

  it("compares stack shape without line-number instability", () => {
    const score = getScorer();
    expect(score).toEqual(expect.any(Function));
    if (typeof score !== "function") return;

    const candidate = {
      ...target,
      callStack: [
        "at CheckoutPage.submit (/tests/checkout.ts:99:2)",
        "at checkout (/tests/checkout.spec.ts:77:8)",
      ],
    };
    expect(score(target, candidate)?.signals.stackShape).toBe(1);
  });

  it("matches normalized spec paths", () => {
    const score = getScorer();
    expect(score).toEqual(expect.any(Function));
    if (typeof score !== "function") return;

    const candidate = { ...target, specPath: "tests\\checkout.spec.ts" };
    expect(score(target, candidate)?.signals.specPath).toBe(1);
  });

  it("does not turn missing signals into a perfect match", () => {
    const score = getScorer();
    expect(score).toEqual(expect.any(Function));
    if (typeof score !== "function") return;

    expect(
      score(
        { message: "same", callStack: null, specPath: null },
        { message: "same", callStack: null, specPath: null },
      ),
    ).toBeNull();
  });

  it("applies the qualifying threshold", () => {
    const select = getSelector();
    expect(select).toEqual(expect.any(Function));
    if (typeof select !== "function") return;

    const candidates: Candidate[] = [
      {
        issueId: "issue-low",
        issue: { id: "issue-low", name: "Different failure" },
        evidence: [
          {
            message: "database connection refused",
            callStack: ["at connect (/db.ts:1:1)"],
            specPath: "/tests/database.spec.ts",
          },
        ],
      },
    ];
    expect(select(target, candidates)).toBeNull();
  });

  it("uses stable issue-id tie-breaking for equal scores", () => {
    const select = getSelector();
    expect(select).toEqual(expect.any(Function));
    if (typeof select !== "function") return;

    const candidates: Candidate[] = [
      {
        issueId: "issue-b",
        issue: { id: "issue-b", name: "B" },
        evidence: [target],
      },
      {
        issueId: "issue-a",
        issue: { id: "issue-a", name: "A" },
        evidence: [target],
      },
    ];
    expect(select(target, candidates)).toEqual(
      expect.objectContaining({ issueId: "issue-a", score: 100 }),
    );
  });
});
