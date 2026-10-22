// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import {
  DEFAULT_OPENROUTER_CONCURRENCY,
  DEFAULT_OPENROUTER_RETRIES,
  DEFAULT_OPENROUTER_TIMEOUT_MS,
  OPENROUTER_EVALUATION_PROFILES,
  resolveOpenRouterProfile,
} from "@/root/__prompts-tests__/stored-results-analysis/runners/openrouter-profiles";
import {
  createOpenRouterCategoryQuestion,
  OPENROUTER_CATEGORY_CRITERIA,
  OPENROUTER_CATEGORY_INSTRUCTIONS,
  OPENROUTER_CATEGORY_POLICY_VERSION,
  OPENROUTER_CATEGORY_PRIORITY,
  toOpenRouterEvidence,
} from "@/root/__prompts-tests__/stored-results-analysis/runners/openrouter-policy";
import {
  OpenRouterEvaluationRunError,
  runOpenRouterStoredResultsAnalysis,
} from "@/root/__prompts-tests__/stored-results-analysis/runners/openrouter-stored-results-analysis";
import { OpenRouterDecisionsError } from "@/lib/openrouter-decisions/transport";
import { STORED_RESULT_CATEGORY_POLICY_VERSION } from "@/lib/storedResultCategoryPolicy";
import { OPENROUTER_ENDPOINT } from "@/root/__prompts-tests__/stored-results-analysis/runners/openrouter-report";
import type { OpenRouterDecisionsRequest } from "@/lib/openrouter-decisions/schemas";
import type {
  TestCase,
  Category,
} from "@/root/__prompts-tests__/stored-results-analysis/v1.1.0/templates/types";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  fingerprintOpenRouterDataset,
  resolveOpenRouterReportDirectory,
  writeOpenRouterEvaluationReport,
} from "@/root/__prompts-tests__/stored-results-analysis/runners/openrouter-report";
import type { OpenRouterEvalResult } from "@/root/__prompts-tests__/stored-results-analysis/runners/openrouter-stored-results-analysis";
import { runOpenRouterSuite } from "@/root/__prompts-tests__/stored-results-analysis/runners/openrouter-suite";
import { resolveOpenRouterTestConfig } from "@/root/__prompts-tests__/stored-results-analysis/openrouterTestEnv";

describe("OpenRouter live-suite environment", () => {
  test.each([undefined, "", "  \t\n"])(
    "disables live suites for a missing or blank key (%s)",
    (apiKey) => {
      expect(
        resolveOpenRouterTestConfig({
          OPENROUTER_API_KEY: apiKey,
        }),
      ).toEqual({ enabled: false, profile: "openai" });
    },
  );

  test("defaults to OpenAI without requiring a direct-provider key", () => {
    expect(
      resolveOpenRouterTestConfig({ OPENROUTER_API_KEY: "openrouter-key" }),
    ).toEqual({ enabled: true, profile: "openai" });
  });
});

describe("OpenRouter evaluation profiles", () => {
  test.each([["openai", "openai/gpt-6-luna-decisions"]] as const)(
    "selects %s with an explicit model and zero retries",
    (id, model) => {
      expect(resolveOpenRouterProfile(id)).toEqual({
        id,
        model,
        concurrency: DEFAULT_OPENROUTER_CONCURRENCY,
        timeoutMs: DEFAULT_OPENROUTER_TIMEOUT_MS,
        maxRetries: DEFAULT_OPENROUTER_RETRIES,
      });
    },
  );

  test("exposes only the selected OpenAI profile", () => {
    expect(Object.keys(OPENROUTER_EVALUATION_PROFILES)).toEqual(["openai"]);
  });

  test("validates execution overrides", () => {
    expect(
      resolveOpenRouterProfile("openai", { concurrency: 3, timeoutMs: 10_000 }),
    ).toMatchObject({ concurrency: 3, timeoutMs: 10_000 });

    for (const concurrency of [0, -1, 1.5, 33]) {
      expect(() => resolveOpenRouterProfile("openai", { concurrency })).toThrow(
        "concurrency",
      );
    }
    for (const timeoutMs of [0, -1, 1.5, 120_001]) {
      expect(() => resolveOpenRouterProfile("openai", { timeoutMs })).toThrow(
        "timeoutMs",
      );
    }
  });

  test.each(["jev", "microsoft", "unsupported"])(
    "rejects unsupported profile %s",
    (profile) => {
      expect(() => resolveOpenRouterProfile(profile)).toThrow(
        "expected 'openai'",
      );
    },
  );

  test("rejects unsupported runtime model overrides", () => {
    expect(() =>
      resolveOpenRouterProfile("openai", { model: "other/model" } as never),
    ).toThrow("Unsupported OpenRouter evaluation override(s): model");
  });
});

describe("OpenRouter category policy", () => {
  test("uses the shared category order and definitions", () => {
    const question = createOpenRouterCategoryQuestion();

    expect(OPENROUTER_CATEGORY_POLICY_VERSION).toBe(
      "stored-results-analysis-v1.1.0-category-v1",
    );
    expect(OPENROUTER_CATEGORY_POLICY_VERSION).toBe(
      STORED_RESULT_CATEGORY_POLICY_VERSION,
    );
    expect(OPENROUTER_CATEGORY_PRIORITY).toEqual([
      "infra",
      "performance",
      "script",
      "bug",
      "other",
    ]);
    expect(question).toEqual({
      type: "choice",
      instructions: OPENROUTER_CATEGORY_INSTRUCTIONS,
      criteria: OPENROUTER_CATEGORY_CRITERIA,
    });
    expect(OPENROUTER_CATEGORY_INSTRUCTIONS.indexOf("infra")).toBeLessThan(
      OPENROUTER_CATEGORY_INSTRUCTIONS.indexOf("performance"),
    );
    expect(OPENROUTER_CATEGORY_INSTRUCTIONS).toContain(
      "generic unknown failures without a diagnostic cause as other",
    );
  });

  test("projects only the nine approved diagnostic evidence fields", () => {
    const evidence = toOpenRouterEvidence({
      id: "case-secret",
      specKey: "api/health.spec.ts",
      specTitle: "health endpoint",
      status: "failed",
      duration: 1200,
      retry: 1,
      executionName: "CI",
      errorMessage: "connect ETIMEDOUT 10.0.0.1:443",
      errorStack: "Error: timeout",
      errorLocation: "health.spec.ts:12",
    });

    expect(Object.keys(evidence)).toEqual([
      "specKey",
      "specTitle",
      "status",
      "duration",
      "retry",
      "executionName",
      "errorMessage",
      "errorStack",
      "errorLocation",
    ]);
    expect(evidence).not.toHaveProperty("id");
    expect(evidence).not.toHaveProperty("name");
    expect(evidence).not.toHaveProperty("expect");
    expect(evidence).not.toHaveProperty("expectedCategory");
  });

  test("constructs precedence and ambiguous-evidence instructions without scoring claims", () => {
    const question = createOpenRouterCategoryQuestion();
    expect(question.instructions).toContain(
      "A test assertion that reports an actual application result different from its expected value is a bug",
    );
    expect(question.criteria.infra).toContain("DNS");
    expect(question.criteria.performance).toContain(
      "heap or memory exhaustion (OOM)",
    );
    expect(question.criteria.performance).toContain(
      "worker/thread/pool exhaustion",
    );
    expect(question.criteria.script).toContain(
      "expected value is itself wrong",
    );
    expect(question.criteria.bug).toContain(
      "NullPointerException or TypeError",
    );
    expect(question.criteria.other).toContain(
      "unknown failure with no diagnostic cause",
    );
    expect(question).not.toHaveProperty("confidence");
  });
});

const evalCase = (index: number, category: Category = "infra"): TestCase => ({
  name: `case ${index}`,
  input: {
    id: `id-${index}`,
    specKey: `spec-${index}.ts`,
    specTitle: `case-${index}`,
    status: "failed",
    duration: index * 10,
    retry: 0,
    executionName: "CI",
    errorMessage: "ETIMEDOUT connecting to service",
  },
  expect: {
    category,
    status: "failed",
    errorQuality: "required",
  },
});

const categoryResponse = (category: Category = "infra") => ({
  answers: {
    category: {
      type: "choice",
      choice: category,
      confidence: 0.8,
      probabilities: {
        infra: category === "infra" ? 0.8 : 0.05,
        performance: category === "performance" ? 0.8 : 0.05,
        script: category === "script" ? 0.8 : 0.05,
        bug: category === "bug" ? 0.8 : 0.05,
        other: category === "other" ? 0.8 : 0.05,
      },
    },
  },
  model: "openai/gpt-6-luna-decisions-20261001",
  provider: "OpenAI",
  id: "request-id",
  usage: { input_tokens: 10, output_tokens: 4, total_tokens: 14, cost: 0.001 },
});

describe("runOpenRouterStoredResultsAnalysis", () => {
  test("runs OpenAI through the exact shared OpenRouter Decisions request", async () => {
    const fetchImpl = jest.fn(
      async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
        expect(String(input)).toBe(OPENROUTER_ENDPOINT);
        const request = JSON.parse(
          String(init?.body),
        ) as OpenRouterDecisionsRequest;
        expect(request.model).toBe("openai/gpt-6-luna-decisions");
        expect(request.provider).toEqual({ allow_fallbacks: false });
        expect(request.questions.category).toEqual({
          type: "choice",
          instructions: OPENROUTER_CATEGORY_INSTRUCTIONS,
          criteria: OPENROUTER_CATEGORY_CRITERIA,
        });
        expect(request.state).toEqual(toOpenRouterEvidence(evalCase(0).input));
        expect(request.state).not.toHaveProperty("id");
        expect(request.state).not.toHaveProperty("name");
        expect(request.state).not.toHaveProperty("expectedCategory");
        return new Response(
          JSON.stringify({
            ...categoryResponse(),
            model: "openai/gpt-6-luna-decisions",
          }),
          { status: 200 },
        );
      },
    );

    const result = await runOpenRouterStoredResultsAnalysis({
      cases: [evalCase(0)],
      profile: "openai",
      apiKey: "openrouter-key",
      fetchImpl: fetchImpl as typeof fetch,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      profile: "openai",
      requestedModel: "openai/gpt-6-luna-decisions",
      accuracy: 1,
    });
  });

  test("keeps input ordering while honoring the concurrency limit", async () => {
    let active = 0;
    let maxActive = 0;
    const completionOrder: string[] = [];
    const submitRequest = jest.fn(
      async (request: OpenRouterDecisionsRequest) => {
        active += 1;
        maxActive = Math.max(active, maxActive);
        const title = String(
          (request.state as Record<string, unknown>).specTitle,
        );
        await new Promise((resolve) =>
          setTimeout(resolve, title === "case-0" ? 20 : 1),
        );
        completionOrder.push(title);
        active -= 1;
        return {
          data: categoryResponse(),
          attempts: 1,
          durationMs: 1,
        };
      },
    );

    const cases = [0, 1, 2, 3].map((index) => evalCase(index));
    const result = await runOpenRouterStoredResultsAnalysis({
      cases,
      profile: "openai",
      concurrency: 2,
      apiKey: "openrouter-key",
      submitRequest,
    });

    expect(maxActive).toBe(2);
    expect(completionOrder).not.toEqual([
      "case-0",
      "case-1",
      "case-2",
      "case-3",
    ]);
    expect(result.predictions.map((prediction) => prediction.name)).toEqual(
      cases.map((testCase) => testCase.name),
    );
    expect(result).toMatchObject({
      profile: "openai",
      requestedModel: "openai/gpt-6-luna-decisions",
      accuracy: 1,
      requestCount: 4,
      attemptCount: 4,
      usage: {
        inputTokens: 40,
        outputTokens: 16,
        totalTokens: 56,
        cost: 0.004,
      },
    });
  });

  test("settles in-flight requests and stops scheduling after first failure", async () => {
    const requestNames: string[] = [];
    let resolveSecond: (() => void) | undefined;
    const submitRequest = jest.fn((request: OpenRouterDecisionsRequest) => {
      const title = String(
        (request.state as Record<string, unknown>).specTitle,
      );
      requestNames.push(title);
      if (title === "case-0") {
        return Promise.reject(
          new OpenRouterDecisionsError("network", "network failed", {
            attempts: 1,
          }),
        );
      }
      if (title === "case-1") {
        return new Promise<{
          data: unknown;
          attempts: number;
          durationMs: number;
        }>((resolve) => {
          resolveSecond = () =>
            resolve({ data: categoryResponse(), attempts: 1, durationMs: 1 });
        });
      }
      return Promise.resolve({
        data: categoryResponse(),
        attempts: 1,
        durationMs: 1,
      });
    });

    const evaluation = runOpenRouterStoredResultsAnalysis({
      cases: [0, 1, 2, 3, 4].map((index) => evalCase(index)),
      profile: "openai",
      concurrency: 2,
      apiKey: "openrouter-key",
      submitRequest,
    });
    const rejection = expect(evaluation).rejects.toBeInstanceOf(
      OpenRouterEvaluationRunError,
    );

    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(resolveSecond).toBeDefined();
    resolveSecond?.();
    await expect(evaluation).rejects.toMatchObject({
      kind: "network",
      requestCount: 2,
      attemptCount: 2,
      completedPredictions: [expect.objectContaining({ name: "case 1" })],
    });
    await rejection;
    expect(requestNames).toEqual(["case-0", "case-1"]);
  });

  test("returns empty input with unavailable accuracy and no provider calls", async () => {
    const submitRequest = jest.fn();
    const result = await runOpenRouterStoredResultsAnalysis({
      cases: [],
      profile: "openai",
      apiKey: "openrouter-key",
      submitRequest,
    });

    expect(result).toMatchObject({
      profile: "openai",
      requestedModel: "openai/gpt-6-luna-decisions",
      predictions: [],
      accuracy: null,
      requestCount: 0,
      attemptCount: 0,
    });
    expect(submitRequest).not.toHaveBeenCalled();
  });

  test("rejects missing OpenRouter credentials without direct-provider fallback", async () => {
    const previous = {
      openrouter: process.env.OPENROUTER_API_KEY,
      openai: process.env.OPENAI_API_KEY,
    };
    delete process.env.OPENROUTER_API_KEY;
    process.env.OPENAI_API_KEY = "openai-only";
    const submitRequest = jest.fn();

    try {
      await expect(
        runOpenRouterStoredResultsAnalysis({
          cases: [evalCase(0)],
          profile: "openai",
          submitRequest,
        }),
      ).rejects.toMatchObject({ kind: "configuration" });
      expect(submitRequest).not.toHaveBeenCalled();
    } finally {
      if (previous.openrouter === undefined)
        delete process.env.OPENROUTER_API_KEY;
      else process.env.OPENROUTER_API_KEY = previous.openrouter;
      if (previous.openai === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = previous.openai;
    }
  });

  test("rejects a runtime model override instead of silently ignoring it", async () => {
    await expect(
      runOpenRouterStoredResultsAnalysis({
        cases: [evalCase(0)],
        profile: "openai",
        apiKey: "openrouter-key",
        model: "other/model",
      } as never),
    ).rejects.toThrow("model overrides are not supported");
  });

  test.each([400, 413])(
    "never emits predictions for HTTP %i input-limit failures",
    async (status) => {
      await expect(
        runOpenRouterStoredResultsAnalysis({
          cases: [evalCase(0)],
          profile: "openai",
          apiKey: "openrouter-key",
          submitRequest: async () => {
            throw new OpenRouterDecisionsError("upstream", `HTTP ${status}`, {
              status,
              attempts: 1,
            });
          },
        }),
      ).rejects.toMatchObject({
        kind: "upstream",
        requestCount: 1,
        attemptCount: 1,
        completedPredictions: [],
      });
    },
  );

  test("propagates an undocumented refusal-shaped response as invalid_response", async () => {
    const submitRequest = jest.fn().mockResolvedValue({
      data: { answers: { category: { type: "refusal", refusal: "blocked" } } },
      attempts: 1,
      durationMs: 1,
    });

    await expect(
      runOpenRouterStoredResultsAnalysis({
        cases: [evalCase(0), evalCase(1)],
        profile: "openai",
        concurrency: 1,
        apiKey: "openrouter-key",
        submitRequest,
      }),
    ).rejects.toMatchObject({ kind: "invalid_response", requestCount: 1 });
    expect(submitRequest).toHaveBeenCalledTimes(1);
  });
});

describe("OpenRouter evaluation reports", () => {
  const reportResult: OpenRouterEvalResult = {
    profile: "openai",
    requestedModel: "openai/gpt-6-luna-decisions",
    predictions: [
      {
        id: "case-1",
        name: "network timeout",
        expectedCategory: "infra",
        actualCategory: "infra",
        confidence: 0.8,
        probabilities: {
          infra: 0.8,
          performance: 0.05,
          script: 0.05,
          bug: 0.05,
          other: 0.05,
        },
        requestedModel: "openai/gpt-6-luna-decisions",
        returnedModel: "openai/gpt-6-luna-decisions-20261001",
        provider: "OpenAI",
        upstreamRequestId: "request-1",
        durationMs: 123,
        attempts: 1,
        usage: {
          inputTokens: null,
          outputTokens: null,
          totalTokens: null,
          cost: null,
        },
        rawAnswer: {
          type: "choice",
          choice: "infra",
          confidence: 0.8,
          probabilities: {
            infra: 0.8,
            performance: 0.05,
            script: 0.05,
            bug: 0.05,
            other: 0.05,
          },
        },
      },
    ],
    failures: [],
    accuracy: 1,
    durationMs: 123,
    requestCount: 1,
    attemptCount: 1,
    usage: {
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      cost: null,
    },
  };

  test("separates OpenAI smoke and regression reports", () => {
    expect(resolveOpenRouterReportDirectory("openai", "smoke")).not.toBe(
      resolveOpenRouterReportDirectory("openai", "regression"),
    );
    expect(resolveOpenRouterReportDirectory("openai", "smoke")).toContain(
      path.join("reports", "openrouter", "openai", "smoke"),
    );
  });

  test("fingerprints ordered dataset content", () => {
    const cases = [evalCase(0), evalCase(1)];
    expect(fingerprintOpenRouterDataset(cases)).toMatch(
      /^sha256:[a-f0-9]{64}$/,
    );
    expect(fingerprintOpenRouterDataset(cases)).toBe(
      fingerprintOpenRouterDataset(cases),
    );
    expect(fingerprintOpenRouterDataset(cases)).not.toBe(
      fingerprintOpenRouterDataset([...cases].reverse()),
    );
  });

  test("writes timestamped/latest report metadata without credentials", async () => {
    const outputDirectory = await mkdtemp(
      path.join(os.tmpdir(), "openrouter-report-"),
    );
    try {
      const datasetFingerprint = fingerprintOpenRouterDataset([evalCase(0)]);
      const paths = await writeOpenRouterEvaluationReport(
        {
          suite: "smoke",
          datasetVersion: "v1.1.0",
          datasetFingerprint,
          policyVersion: OPENROUTER_CATEGORY_POLICY_VERSION,
          result: reportResult,
        },
        {
          outputDirectory,
          now: new Date("2026-10-14T12:30:00.000Z"),
        },
      );
      const timestamped = JSON.parse(
        await readFile(paths.timestampedReportPath, "utf8"),
      );
      const latest = JSON.parse(await readFile(paths.latestReportPath, "utf8"));

      expect(paths.timestampedReportPath).toContain("2026-10-14T12-30-00-000Z");
      expect(timestamped).toMatchObject({
        schemaVersion: 1,
        gateway: "openrouter",
        endpoint: "https://openrouter.ai/api/alpha/decisions",
        apiMode: "alpha.decisions",
        profile: "openai",
        requestedModel: "openai/gpt-6-luna-decisions",
        suite: "smoke",
        datasetVersion: "v1.1.0",
        datasetFingerprint,
        policyVersion: OPENROUTER_CATEGORY_POLICY_VERSION,
        complete: true,
        totalCases: 1,
        correctCases: 1,
        accuracy: 1,
        requestCount: 1,
        attemptCount: 1,
        usage: {
          inputTokens: null,
          outputTokens: null,
          totalTokens: null,
          cost: null,
        },
        cases: [
          expect.objectContaining({
            requestedModel: "openai/gpt-6-luna-decisions",
            returnedModel: "openai/gpt-6-luna-decisions-20261001",
            upstreamProvider: "OpenAI",
            upstreamRequestId: "request-1",
            rawAnswer: reportResult.predictions[0]?.rawAnswer,
            usage: {
              inputTokens: null,
              outputTokens: null,
              totalTokens: null,
              cost: null,
            },
          }),
        ],
      });
      expect(latest).toEqual(timestamped);
      expect(await readFile(paths.latestReportPath, "utf8")).not.toContain(
        "secret-key",
      );
    } finally {
      await rm(outputDirectory, { recursive: true, force: true });
    }
  });

  test("writes only validated OpenAI answers and scoped report metadata", async () => {
    const outputDirectory = await mkdtemp(
      path.join(os.tmpdir(), "openai-decision-report-"),
    );
    try {
      const openaiResult: OpenRouterEvalResult = {
        ...reportResult,
        profile: "openai",
        requestedModel: "openai/gpt-6-luna-decisions",
        predictions: reportResult.predictions.map(
          (prediction) =>
            ({
              ...prediction,
              requestedModel: "openai/gpt-6-luna-decisions",
              returnedModel: "openai/gpt-6-luna-decisions-20261016",
              rawAnswer: {
                type: "choice",
                choice: "infra",
                confidence: 0.8,
                probabilities: prediction.probabilities,
              },
              provider: null,
              upstreamRequestId: null,
              usage: {
                inputTokens: 10,
                outputTokens: 4,
                totalTokens: 14,
                cost: 0.001,
              },
              unexpectedFullResponse: { secret: "provider-body" },
            }) as never,
        ),
      };
      const datasetFingerprint = fingerprintOpenRouterDataset([evalCase(0)]);
      const paths = await writeOpenRouterEvaluationReport(
        {
          suite: "regression",
          datasetVersion: "v1.1.0",
          datasetFingerprint,
          policyVersion: OPENROUTER_CATEGORY_POLICY_VERSION,
          result: openaiResult,
        },
        { outputDirectory, now: new Date("2026-10-16T11:15:00.000Z") },
      );
      const contents = await readFile(paths.timestampedReportPath, "utf8");
      const report = JSON.parse(contents);

      expect(paths.timestampedReportPath).toContain("2026-10-16T11-15-00-000Z");
      expect(report).toMatchObject({
        profile: "openai",
        requestedModel: "openai/gpt-6-luna-decisions",
        suite: "regression",
        datasetVersion: "v1.1.0",
        datasetFingerprint,
        policyVersion: OPENROUTER_CATEGORY_POLICY_VERSION,
        generatedAt: "2026-10-16T11:15:00.000Z",
        cases: [
          expect.objectContaining({
            rawAnswer: {
              type: "choice",
              choice: "infra",
              confidence: 0.8,
              probabilities: reportResult.predictions[0]?.probabilities,
            },
            durationMs: 123,
            returnedModel: "openai/gpt-6-luna-decisions-20261016",
            usage: {
              inputTokens: 10,
              outputTokens: 4,
              totalTokens: 14,
              cost: 0.001,
            },
          }),
        ],
      });
      expect(contents).not.toContain("provider-body");
      expect(contents).not.toContain("secret-key");
      expect(contents).not.toContain("Authorization");
    } finally {
      await rm(outputDirectory, { recursive: true, force: true });
    }
  });
});

describe("runOpenRouterSuite", () => {
  let outputDirectory: string;

  beforeEach(async () => {
    outputDirectory = await mkdtemp(
      path.join(os.tmpdir(), "openrouter-suite-"),
    );
  });

  afterEach(async () => {
    await rm(outputDirectory, { recursive: true, force: true });
  });

  const runSuite = (
    suite: "smoke" | "regression",
    cases: TestCase[],
    categories: Category[],
  ) =>
    runOpenRouterSuite({
      suite,
      cases,
      profile: "openai",
      concurrency: 1,
      apiKey: "openrouter-key",
      outputDirectory,
      submitRequest: jest.fn(async (request: OpenRouterDecisionsRequest) => {
        const title = String(
          (request.state as Record<string, unknown>).specTitle,
        );
        const index = Number(title.replace("case-", ""));
        return {
          data: categoryResponse(categories[index] ?? "infra"),
          attempts: 1,
          durationMs: 1,
        };
      }),
    });

  test("writes a completed all-correct smoke report", async () => {
    const cases = [evalCase(0), evalCase(1)];
    const outcome = await runSuite("smoke", cases, ["infra", "infra"]);

    expect(outcome.result.accuracy).toBe(1);
    const report = JSON.parse(
      await readFile(outcome.reportPaths.latestReportPath, "utf8"),
    );
    expect(report).toMatchObject({
      complete: true,
      suite: "smoke",
      accuracy: 1,
    });
  });

  test("accepts the exact 90 percent regression boundary", async () => {
    const cases = Array.from({ length: 10 }, (_, index) => evalCase(index));
    const categories = cases.map((_, index) =>
      index === 0 ? "bug" : "infra",
    ) as Category[];
    const outcome = await runSuite("regression", cases, categories);

    expect(outcome.result.accuracy).toBe(0.9);
    const report = JSON.parse(
      await readFile(outcome.reportPaths.latestReportPath, "utf8"),
    );
    expect(report.accuracy).toBe(0.9);
  });

  test("persists a below-threshold complete report before rejecting", async () => {
    const cases = Array.from({ length: 10 }, (_, index) => evalCase(index));
    const categories = cases.map((_, index) =>
      index < 2 ? "bug" : "infra",
    ) as Category[];

    await expect(runSuite("regression", cases, categories)).rejects.toThrow(
      "Report:",
    );
    const report = JSON.parse(
      await readFile(path.join(outputDirectory, "latest.json"), "utf8"),
    );
    expect(report).toMatchObject({
      complete: true,
      accuracy: 0.8,
      correctCases: 8,
    });
  });

  test("rejects empty datasets before provider work", async () => {
    const submitRequest = jest.fn();
    await expect(
      runOpenRouterSuite({
        suite: "smoke",
        cases: [],
        profile: "openai",
        apiKey: "openrouter-key",
        outputDirectory,
        submitRequest,
      }),
    ).rejects.toThrow("dataset must not be empty");
    expect(submitRequest).not.toHaveBeenCalled();
  });

  test("does not write complete reports for invalid or partial executions", async () => {
    const submitRequest = jest.fn().mockResolvedValue({
      data: { error: { code: "refused" } },
      attempts: 1,
      durationMs: 1,
    });

    await expect(
      runOpenRouterSuite({
        suite: "smoke",
        cases: [evalCase(0), evalCase(1)],
        profile: "openai",
        concurrency: 1,
        apiKey: "openrouter-key",
        outputDirectory,
        submitRequest,
      }),
    ).rejects.toMatchObject({ kind: "invalid_response" });
    await expect(
      readFile(path.join(outputDirectory, "latest.json"), "utf8"),
    ).rejects.toThrow();
    expect(submitRequest).toHaveBeenCalledTimes(1);
  });
});
