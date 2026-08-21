// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { resultErrorModel } from "@/models/resultErrorModel";
import { resultErrorService } from "@/services/resultErrorService";

jest.mock("@/lib/logger", () => ({
  __esModule: true,
  default: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

const now = new Date("2026-08-19T10:00:00Z");
const targetRecord = {
  id: "target-error",
  type: "assertion",
  message: "Timeout waiting for checkout submit button",
  callLog: [],
  callStack: ["at CheckoutPage.submit (/tests/checkout.ts:42:7)"],
  rawLogs: null,
  sourceSnippet: null,
  generatedTestCase: null,
  location: "checkout.spec.ts:18",
  result: {
    id: "target-result",
    retry: 0,
    status: "failed",
    duration: 1000,
    startTime: now,
    reportPortalLink: null,
    spec: {
      id: "spec-1",
      key: "CHECKOUT",
      title: "checkout",
      file: "/tests/checkout.spec.ts",
    },
    execution: { id: "exec-1", name: "nightly", environment: "staging" },
  },
  assumptions: [],
};

const matchingCandidate = {
  projectId: "project-1",
  issue: {
    id: "issue-1",
    name: "Checkout timeout",
    description: null,
    portal: null,
    service: "checkout",
    ticket: null,
  },
  evidence: [
    {
      resultErrorId: "evidence-1",
      resultId: "other-result-1",
      analysisCategory: "bug",
      analysisFeedbackCategory: "infra",
      isConfirmed: true,
      message: "Timeout waiting for checkout submit button",
      callStack: ["at CheckoutPage.submit (/tests/checkout.ts:99:2)"],
      specPath: "/tests/checkout.spec.ts",
    },
    {
      resultErrorId: "evidence-2",
      resultId: "other-result-2",
      analysisCategory: "bug",
      analysisFeedbackCategory: "infra",
      isConfirmed: true,
      message: "Timeout waiting for checkout submit button",
      callStack: ["at CheckoutPage.submit (/tests/checkout.ts:100:2)"],
      specPath: "/tests/checkout.spec.ts",
    },
  ],
};

const installCandidateMock = (value: unknown) => {
  Reflect.set(resultErrorModel, "findSimilarityCandidates", jest.fn().mockResolvedValue(value));
};

describe("resultErrorService similarity suggestions", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(resultErrorModel, "findModalContext").mockResolvedValue(
      targetRecord as never,
    );
  });

  afterEach(() => {
    Reflect.deleteProperty(resultErrorModel, "findSimilarityCandidates");
  });

  it("returns the best qualifying match and affected-test count", async () => {
    installCandidateMock([matchingCandidate]);
    const getSuggestion = Reflect.get(
      resultErrorService,
      "getSimilaritySuggestion",
    );
    expect(getSuggestion).toEqual(expect.any(Function));
    if (typeof getSuggestion !== "function") return;

    await expect(
      getSuggestion.call(resultErrorService, "target-error", "project-1"),
    ).resolves.toEqual({
      outcome: "match",
      suggestion: {
        issue: matchingCandidate.issue,
        category: "infra",
        score: 100,
        otherAffectedTests: 2,
      },
    });
  });

  it("returns an explicit no-match outcome below threshold", async () => {
    installCandidateMock([
      {
        ...matchingCandidate,
        evidence: [
          {
            ...matchingCandidate.evidence[0],
            message: "database refused connection",
            callStack: ["at connect (/db.ts:1:1)"],
            specPath: "/tests/database.spec.ts",
          },
        ],
      },
    ]);
    const getSuggestion = Reflect.get(
      resultErrorService,
      "getSimilaritySuggestion",
    );
    expect(getSuggestion).toEqual(expect.any(Function));
    if (typeof getSuggestion !== "function") return;

    await expect(
      getSuggestion.call(resultErrorService, "target-error", "project-1"),
    ).resolves.toEqual({ outcome: "no_match" });
  });

  it("excludes foreign and unconfirmed candidate evidence defensively", async () => {
    installCandidateMock([
      { ...matchingCandidate, projectId: "foreign-project" },
      {
        ...matchingCandidate,
        issue: { ...matchingCandidate.issue, id: "issue-unconfirmed" },
        evidence: matchingCandidate.evidence.map((evidence) => ({
          ...evidence,
          isConfirmed: false,
        })),
      },
    ]);
    const getSuggestion = Reflect.get(
      resultErrorService,
      "getSimilaritySuggestion",
    );
    expect(getSuggestion).toEqual(expect.any(Function));
    if (typeof getSuggestion !== "function") return;

    await expect(
      getSuggestion.call(resultErrorService, "target-error", "project-1"),
    ).resolves.toEqual({ outcome: "no_match" });
  });

  it("rejects inaccessible target errors before candidate lookup", async () => {
    jest.spyOn(resultErrorModel, "findModalContext").mockResolvedValue(null);
    const candidateLookup = jest.fn();
    Reflect.set(resultErrorModel, "findSimilarityCandidates", candidateLookup);
    const getSuggestion = Reflect.get(
      resultErrorService,
      "getSimilaritySuggestion",
    );
    expect(getSuggestion).toEqual(expect.any(Function));
    if (typeof getSuggestion !== "function") return;

    await expect(
      getSuggestion.call(resultErrorService, "target-error", "foreign-project"),
    ).rejects.toThrow("Result error with ID target-error not found");
    expect(candidateLookup).not.toHaveBeenCalled();
  });

  it("does not create or connect an assumption while searching", async () => {
    installCandidateMock([matchingCandidate]);
    const assignSpy = jest.spyOn(resultErrorModel, "assignIssue");
    const getSuggestion = Reflect.get(
      resultErrorService,
      "getSimilaritySuggestion",
    );
    expect(getSuggestion).toEqual(expect.any(Function));
    if (typeof getSuggestion !== "function") return;

    await getSuggestion.call(resultErrorService, "target-error", "project-1");
    expect(assignSpy).not.toHaveBeenCalled();
  });
});
