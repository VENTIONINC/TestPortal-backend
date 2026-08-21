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

const buildContextRecord = () => ({
  id: "error-1",
  type: "assertion",
  message: "checkout failed",
  callLog: ["click submit"],
  callStack: ["at checkout.spec.ts:12:3"],
  rawLogs: ["browser started"],
  sourceSnippet: {
    path: "checkout.spec.ts",
    text: "line 10\nline 11\nline 12",
    startLine: 10,
    failingLine: 12,
  },
  generatedTestCase: "test('checkout', async () => {});",
  location: "checkout.spec.ts:12",
  result: {
    id: "result-1",
    retry: 1,
    status: "failed",
    duration: 3200,
    startTime: now,
    reportPortalLink: "https://allure.example/result-1",
    analysisCategory: "bug",
    analysisFeedbackCategory: "infra",
    spec: {
      id: "spec-1",
      key: "CHECKOUT-1",
      title: "checkout",
      file: "checkout.spec.ts",
    },
    execution: {
      id: "execution-1",
      name: "nightly",
      environment: "staging",
    },
  },
  assumptions: [
    {
      id: "confirmed-1",
      isConfirmed: true,
      score: 0.91,
      madeBy: "user",
      createdAt: now,
      issue: {
        id: "issue-1",
        name: "Checkout is flaky",
        description: "Intermittent checkout failure",
        portal: null,
        service: "checkout",
        ticket: "QA-1",
      },
    },
    {
      id: "suggested-1",
      isConfirmed: false,
      score: 0.84,
      madeBy: "algorithm",
      createdAt: now,
      issue: {
        id: "issue-2",
        name: "Submit timeout",
        description: null,
        portal: null,
        service: null,
        ticket: null,
      },
    },
  ],
});

const getModalContextMethod = () =>
  Reflect.get(resultErrorService, "getModalContext");

describe("resultErrorService modal context", () => {
  afterEach(() => jest.restoreAllMocks());

  it("returns accessible result metadata, optional tabs, and assignment summaries", async () => {
    const getModalContext = getModalContextMethod();
    expect(getModalContext).toEqual(expect.any(Function));
    if (typeof getModalContext !== "function") return;
    jest
      .spyOn(resultErrorModel as never, "findModalContext" as never)
      .mockResolvedValue(buildContextRecord() as never);

    await expect(
      getModalContext.call(resultErrorService, "error-1", "project-1"),
    ).resolves.toEqual({
      error: expect.objectContaining({
        id: "error-1",
        logs: ["browser started"],
        sourceSnippet: expect.objectContaining({ failingLine: 12 }),
        generatedTestCase: "test('checkout', async () => {});",
      }),
      result: expect.objectContaining({
        id: "result-1",
        attempt: 2,
        duration: 3200,
        testTitle: "checkout",
        specPath: "checkout.spec.ts",
        executionName: "nightly",
        environment: "staging",
        category: "infra",
      }),
      assignments: {
        confirmed: expect.objectContaining({
          id: "confirmed-1",
          issue: expect.objectContaining({ id: "issue-1" }),
        }),
        suggestions: [
          expect.objectContaining({
            id: "suggested-1",
            issue: expect.objectContaining({ id: "issue-2" }),
          }),
        ],
      },
    });
  });

  it("normalizes absent optional and assignment data", async () => {
    const getModalContext = getModalContextMethod();
    expect(getModalContext).toEqual(expect.any(Function));
    if (typeof getModalContext !== "function") return;
    const record = buildContextRecord();
    Object.assign(record, {
      rawLogs: null,
      sourceSnippet: null,
      generatedTestCase: null,
      assumptions: [],
    });
    jest
      .spyOn(resultErrorModel as never, "findModalContext" as never)
      .mockResolvedValue(record as never);

    const context = await getModalContext.call(
      resultErrorService,
      "error-1",
      "project-1",
    );

    expect(context.error).toEqual(
      expect.objectContaining({
        logs: [],
        sourceSnippet: null,
        generatedTestCase: null,
      }),
    );
    expect(context.assignments).toEqual({ confirmed: null, suggestions: [] });
  });

  it("does not disclose context when the project-scoped lookup misses", async () => {
    const getModalContext = getModalContextMethod();
    expect(getModalContext).toEqual(expect.any(Function));
    if (typeof getModalContext !== "function") return;
    jest
      .spyOn(resultErrorModel as never, "findModalContext" as never)
      .mockResolvedValue(null as never);

    await expect(
      getModalContext.call(resultErrorService, "error-1", "foreign-project"),
    ).rejects.toThrow("Result error with ID error-1 not found");
  });
});
