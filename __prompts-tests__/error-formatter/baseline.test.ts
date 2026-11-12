// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "../testEnv";
import path from "node:path";
import type { UsageMetadata } from "@langchain/core/messages";
import { initializeAiConfig } from "@/config/aiConfig";
import type { AiOperationConfig } from "@/config/aiConfigSchema";
import {
  sumTokenUsage,
  writePromptEvaluationReport,
} from "../helpers/evaluation";

import { errorFormatterService } from "@/services/errorFormatterService";
import {
  errorFormatterSchema,
  type ErrorFormatterInput,
} from "@/schemas/errorFormatterSchemas";

// Keep the production formatter and real OpenAI call; isolate unrelated DB services.
jest.mock("@langchain/openai", () => {
  const actual =
    jest.requireActual<typeof import("@langchain/openai")>("@langchain/openai");
  const { createUsageCollector } = jest.requireActual<
    typeof import("../helpers/evaluation")
  >("../helpers/evaluation");
  const { usageEntries, callbacks } = createUsageCollector();
  return {
    ...actual,
    usageEntries,
    ChatOpenAI: jest.fn(
      (options: ConstructorParameters<typeof actual.ChatOpenAI>[0]) => {
        return new actual.ChatOpenAI({
          ...options,
          callbacks,
        });
      },
    ),
  };
});
jest.mock("@/services/resultService", () => ({ resultService: {} }));
jest.mock("@/services/testAnalysisService", () => ({
  testAnalysisService: {},
}));

jest.mock("@/lib/generativeAi", () => {
  const actual = jest.requireActual<typeof import("@/lib/generativeAi")>(
    "@/lib/generativeAi",
  );
  const config = jest.requireActual<typeof import("@/config/aiConfig")>(
    "@/config/aiConfig",
  );
  const evaluationOverrides = jest.requireActual<
    typeof import("../helpers/formatter-evaluation")
  >("../helpers/formatter-evaluation");
  const observations: Array<{
    settings: unknown;
    connection: "openai" | "custom";
    overrides: Partial<AiOperationConfig>;
    returnedModels: string[];
  }> = [];
  return {
    ...actual,
    __evaluation: { observations },
    createGenerativeAiClient: (
      operation: Parameters<typeof actual.createGenerativeAiClient>[0],
      snapshot = config.getAiConfigSnapshot(),
    ) => {
      const { client, overrides } =
        evaluationOverrides.createFormatterEvaluationClient(
          (selectedOverrides: Partial<AiOperationConfig>) =>
            actual.createGenerativeAiClient(
              operation,
              snapshot,
              selectedOverrides,
            ),
          process.env,
        );
      const observation = {
        settings: client.effectiveSettings,
        connection: client.connection,
        overrides,
        returnedModels: [] as string[],
      };
      observations.push(observation);
      return {
        ...client,
        async invoke<T>(operationCall: () => Promise<T>): Promise<T> {
          const result = await client.invoke(operationCall);
          if (
            typeof result === "object" &&
            result !== null &&
            "raw" in result &&
            typeof result.raw === "object" &&
            result.raw !== null &&
            "response_metadata" in result.raw &&
            typeof result.raw.response_metadata === "object" &&
            result.raw.response_metadata !== null &&
            "model" in result.raw.response_metadata
          ) {
            const returnedModel = actual.safeModelIdentifier(
              result.raw.response_metadata.model,
            );
            if (returnedModel) observation.returnedModels.push(returnedModel);
          }
          return result;
        },
      };
    },
  };
});

interface Case {
  name: string;
  input: ErrorFormatterInput;
  required: RegExp[];
  forbidden?: RegExp[];
}

const cases: Case[] = [
  {
    name: "preserves expected and actual HTTP status without category context",
    input: {
      name: "users api fail",
      description: "GET /api/users: expected HTTP 200, received HTTP 503.",
    },
    required: [/\/api\/users/, /GET/, /200/, /503/],
    forbidden: [/\b500\b/],
  },
  {
    name: "preserves timeout and selector",
    input: {
      name: "checkout timeout",
      description:
        "Timeout 12000ms exceeded waiting for selector #checkout-submit.",
      contextCategory: "performance",
    },
    required: [
      /#checkout-submit/,
      /12,?000\s*(?:ms|milliseconds)|12\s*seconds/i,
    ],
  },
  {
    name: "preserves DNS error and host",
    input: {
      name: "network fail",
      description: "getaddrinfo ENOTFOUND payments.internal.test",
      contextCategory: "infra",
    },
    required: [/ENOTFOUND/, /payments\.internal\.test/],
  },
  {
    name: "preserves source location and exception",
    input: {
      name: "fixture broke",
      description:
        "TypeError: Cannot read properties of undefined (reading 'token')\n at tests/fixtures/auth.ts:42:7",
      contextCategory: "script",
    },
    required: [
      /TypeError/,
      /undefined/,
      /token/,
      /tests\/fixtures\/auth\.ts/,
      /:42:7|line\s+42,?\s*(?:and\s+)?column\s+7/i,
    ],
  },
  {
    name: "preserves assertion values",
    input: {
      name: "cart total wrong",
      description: "Expected cart total 19.99 EUR, received 29.99 EUR.",
      contextCategory: "bug",
    },
    required: [/19\.99/, /29\.99/, /EUR/],
  },
  {
    name: "preserves explicit uncertainty",
    input: {
      name: "unknown failure",
      description:
        "Operation failed. No stack trace or diagnostic details are available. Root cause is unknown.",
      contextCategory: "other",
    },
    required: [
      /unknown|unclear|undetermined|not (?:yet )?(?:known|determined)|cannot (?:be )?(?:determined|identified)|insufficient/i,
    ],
    forbidden: [
      /(?:caused by|due to|root cause is) (?:a |an |the )?(?:database|network|memory|server|configuration)/i,
    ],
  },
];

describe("error formatter baseline and comparisons", () => {
  jest.setTimeout(120_000);
  const records: Array<Record<string, unknown>> = [];
  const { usageEntries } = jest.requireMock<{
    usageEntries: Array<UsageMetadata | null>;
  }>("@langchain/openai");
  const evaluationMocks: {
    __evaluation: {
      observations: Array<{
        settings: {
          model: string;
          [key: string]: unknown;
        };
        connection: "openai" | "custom";
        overrides: Partial<AiOperationConfig>;
        returnedModels: string[];
      }>;
    };
  } = jest.requireMock("@/lib/generativeAi");

  beforeAll(async () => {
    await initializeAiConfig();
  });

  afterAll(() => {
    const observation = evaluationMocks.__evaluation.observations[0];
    if (!observation) return;
    const report = writePromptEvaluationReport(
      path.resolve("__prompts-tests__/error-formatter/reports"),
      {
        provider: "openai",
        model: observation.settings.model,
        promptVersion: "v1.1.0",
        settings: observation.settings,
        mode: Object.keys(observation.overrides).length
          ? "comparison"
          : "baseline",
        connection: observation.connection,
        overrides: observation.overrides,
        returnedModels: Array.from(new Set(observation.returnedModels)),
        usage: sumTokenUsage(usageEntries),
        usageEntries,
        // These checks cover factual anchors, not a complete semantic quality judgment.
        reviewRubric: [
          "No invented facts or confirmed root causes",
          "Expected and actual values retain their roles",
          "Readable concise wording",
          "Actionable advice grounded in input",
        ],
        records,
      },
    );
    console.log(`OpenAI formatter report: ${report.archivedPath}`);
  });

  it.each(cases)("$name", async (testCase) => {
    const startedAt = Date.now();
    const usageStart = usageEntries.length;
    const record: Record<string, unknown> = {
      name: testCase.name,
      input: testCase.input,
      passed: false,
    };
    records.push(record);
    try {
      const output = await errorFormatterService.formatErrorMessage(
        testCase.input,
      );
      record.output = output;
      expect(usageEntries.length).toBeGreaterThan(usageStart);
      expect(usageEntries.slice(usageStart)).not.toContain(null);
      expect(errorFormatterSchema.strict().safeParse(output).success).toBe(
        true,
      );
      expect(output.name.trim().length).toBeGreaterThan(0);
      expect(output.description.trim().length).toBeGreaterThan(0);
      const text = `${output.name}\n${output.description}`;
      for (const pattern of testCase.required) expect(text).toMatch(pattern);
      for (const pattern of testCase.forbidden ?? [])
        expect(text).not.toMatch(pattern);
      record.passed = true;
    } catch (error) {
      record.failure = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      record.durationMs = Date.now() - startedAt;
      record.usage = usageEntries.slice(usageStart);
    }
  });
});
