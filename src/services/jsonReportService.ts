// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { randomUUID } from "node:crypto";

import getLogger from "@/lib/logger";
import { dbClient } from "@/prisma/client";
import { Prisma } from "@prisma/client";
import { parseStackTrace } from "@/lib/parse-error";
import {
  generateFallbackIdentifier,
  type IdentifierStrategy,
} from "@/lib/executionIdentifiers";
import { normalizeJsonStringArray } from "@/lib/jsonPayloads";
import { normalizeResultErrorModalContext } from "@/lib/resultErrorModalContext";
import type {
  PrismaExecution,
  PrismaSpec,
  PrismaResult,
  PrismaResultError,
} from "@/types";
import type { TestResultAnalysis } from "@/schemas/testAnalysisSchemas";
import { DEFAULT_PROJECT_ID } from "@/config/environment";

interface ResultCreateInput {
  reportPortalLink: string | null;
  retry: number;
  status: string;
  duration: number;
  startTime: Date;
  analysisStatus?: string;
  analysisCategory?: string;
  analysisConfidence?: number;
  analysisConclusion?: string;
  analysisErrorQuality?: number;
  analysisErrorQualityConclusion?: string;
  spec: { connect: { id: string } }; // UUID reference to Spec
  execution: { connect: { id: string } }; // UUID reference to Execution
  errors?: { connect: Array<{ id: string }> }; // UUID references to ResultError
}

const logger = getLogger("json-report-service");
const WRITE_BATCH_SIZE = 500;

const chunk = <T>(items: T[], size = WRITE_BATCH_SIZE): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

export interface ReportData {
  runId?: string;
  env?: string;
  version?: string;
  provider: string;
  executionType?: string;
  stats?: {
    startTime?: string | Date;
  };
  tests: TestSpec[];
  analysis?: TestResultAnalysis[];
  identifierStrategy?: IdentifierStrategy;
}

interface TestSpec {
  title: string;
  custom_id?: string;
  location: {
    file: string;
    line: number;
  };
  tags?: string[];
  annotations?: unknown[];
  results: TestResult[];
}

interface TestResult {
  reportPortalLink?: string;
  retry: number;
  status: string;
  duration: number;
  startTime: string | Date;
  error?: ErrorData;
  errors?: ErrorData[];
  logs?: unknown;
  sourceSnippet?: unknown;
  generatedTestCase?: unknown;
  workerIndex: number;
}

interface ErrorData {
  message: string;
  stack: string;
  location: { file: string; line: number };
  rawLogs?: unknown;
  logs?: unknown;
  sourceSnippet?: unknown;
  generatedTestCase?: unknown;
}

const getOrderedErrors = (result: TestResult): ErrorData[] =>
  result.errors?.length ? result.errors : result.error ? [result.error] : [];

export interface ProcessReportResult {
  success: boolean;
  executionId: string;
  specsProcessed: number;
}

export const jsonReportService = {
  /**
   * Process a JSON report and create/update all related database records
   */
  async processReport(
    reportData: ReportData,
    projectId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ProcessReportResult> {
    if (!reportData) {
      throw new Error("Report data is required");
    }

    const {
      runId,
      env,
      version,
      provider,
      executionType,
      stats,
      tests,
      identifierStrategy = "time-period",
    } = reportData;

    // Generate fallback identifier if runId is not provided
    const executionIdentifier =
      runId ??
      generateFallbackIdentifier(
        env,
        version,
        stats?.startTime,
        identifierStrategy,
      );

    logger.info(
      runId
        ? `Processing report with runId: ${runId}`
        : `Processing report with generated identifier: ${executionIdentifier}`,
    );

    const executeLogic = async (
      transactionClient: Prisma.TransactionClient,
    ) => {
      // Create or find execution record
      const executionRecord = await this._findOrCreateExecution(
        {
          runId: executionIdentifier,
          env: env ?? "unknown",
          version: version ?? "unknown",
          provider,
          ...(executionType ? { executionType } : {}),
          ...(stats && { stats }),
          projectId,
        },
        transactionClient,
      );

      if (!tests?.length) {
        throw new Error(`Execution #${executionRecord.id} has no specs`);
      }

      // Process all test specs
      await this._processSpecs(
        tests,
        executionRecord,
        projectId,
        transactionClient,
      );

      logger.info(
        `Successfully processed report for execution #${executionRecord.id}`,
      );

      return {
        success: true,
        executionId: executionRecord.id,
        specsProcessed: tests.length,
      };
    };

    if (tx) {
      return executeLogic(tx);
    }

    return await dbClient.$transaction(executeLogic, {
      timeout: 20000, // Increase timeout for large reports
    });
  },

  /**
   * Find existing execution or create new one
   */
  async _findOrCreateExecution(
    params: {
      runId: string;
      env: string;
      version: string;
      provider: string;
      executionType?: string;
      stats?: { startTime?: string | Date };
      projectId: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<PrismaExecution> {
    const { runId, env, version, provider, executionType, stats, projectId } =
      params;
    const client = tx ?? dbClient;

    let executionRecord = await client.execution.findFirst({
      where: {
        name: runId,
        AND: { projectId },
      },
    });

    if (!executionRecord) {
      executionRecord = await client.execution.create({
        data: {
          type: executionType?.trim() || "nightly",
          name: runId,
          environment: env,
          version,
          provider,
          startedAt: stats?.startTime ? new Date(stats.startTime) : new Date(),
          projectId,
        },
      });

      logger.info(`Created new execution record: ${executionRecord.id}`);
    }

    return executionRecord;
  },

  /**
   * Process all test specs and their results
   */
  async _processSpecs(
    specs: TestSpec[],
    executionRecord: PrismaExecution,
    projectId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? dbClient;
    const specsByKey = new Map<string, TestSpec>();

    for (const spec of specs) {
      if (!spec.title) {
        throw new Error(`Spec data is missing title: ${spec.location?.file}`);
      }

      if (!spec.results?.length) {
        throw new Error(`Spec (${spec.title}) report has no results data`);
      }

      const specKey = this._getSpecKey(spec);
      if (!specsByKey.has(specKey)) {
        specsByKey.set(specKey, spec);
      }
    }

    const specKeys = Array.from(specsByKey.keys());
    const existingSpecs: PrismaSpec[] = [];
    for (const keys of chunk(specKeys)) {
      existingSpecs.push(
        ...(await client.spec.findMany({
          where: { projectId, key: { in: keys } },
        })),
      );
    }

    const existingSpecKeys = new Set(existingSpecs.map(({ key }) => key));
    const missingSpecs = Array.from(specsByKey.entries())
      .filter(([key]) => !existingSpecKeys.has(key))
      .map(([key, spec]) => ({
        key,
        file: spec.location?.file ?? "",
        title: spec.title,
        tags: normalizeJsonStringArray(spec.tags),
        annotations: (Array.isArray(spec.annotations)
          ? spec.annotations
          : []) as Prisma.InputJsonValue,
        projectId: projectId ?? DEFAULT_PROJECT_ID,
      }));

    for (const data of chunk(missingSpecs)) {
      await client.spec.createMany({ data, skipDuplicates: true });
    }

    const persistedSpecs: PrismaSpec[] = [];
    for (const keys of chunk(specKeys)) {
      persistedSpecs.push(
        ...(await client.spec.findMany({
          where: { projectId, key: { in: keys } },
        })),
      );
    }

    const specRecordsByKey = new Map(
      persistedSpecs.map((specRecord) => [specRecord.key, specRecord]),
    );
    const resultInputs = specs.flatMap((spec) => {
      const specKey = this._getSpecKey(spec);
      const specRecord = specRecordsByKey.get(specKey);
      if (!specRecord) {
        throw new Error(`Failed to persist spec with key ${specKey}`);
      }

      return spec.results.map((result) => ({ result, specRecord }));
    });

    const existingResultKeys = new Set<string>();
    for (const inputs of chunk(resultInputs)) {
      const existingResults = await client.result.findMany({
        where: {
          executionId: executionRecord.id,
          OR: inputs.map(({ result, specRecord }) => ({
            specId: specRecord.id,
            startTime: new Date(result.startTime),
          })),
        },
        select: { specId: true, startTime: true },
      });
      existingResults.forEach(({ specId, startTime }) => {
        existingResultKeys.add(`${specId}:${startTime.toISOString()}`);
      });
    }

    const newResultKeys = new Set<string>();
    const resultRecords: Prisma.ResultCreateManyInput[] = [];
    const errorRecords: Prisma.ResultErrorCreateManyInput[] = [];

    for (const { result, specRecord } of resultInputs) {
      const startTime = new Date(result.startTime);
      const resultKey = `${specRecord.id}:${startTime.toISOString()}`;
      if (existingResultKeys.has(resultKey) || newResultKeys.has(resultKey)) {
        continue;
      }

      newResultKeys.add(resultKey);
      const resultId = randomUUID();
      resultRecords.push({
        id: resultId,
        reportPortalLink: result.reportPortalLink ?? null,
        retry: result.retry ?? 0,
        status: result.status,
        duration: result.duration,
        startTime,
        specId: specRecord.id,
        executionId: executionRecord.id,
      });

      for (const [errorIndex, error] of getOrderedErrors(result).entries()) {
        const parsedError = parseStackTrace(error);
        const modalContext = normalizeResultErrorModalContext({
          logs: error.rawLogs ?? error.logs ?? (errorIndex === 0 ? result.logs : undefined),
          sourceSnippet:
            error.sourceSnippet ?? (errorIndex === 0 ? result.sourceSnippet : undefined),
          generatedTestCase:
            error.generatedTestCase ??
            (errorIndex === 0 ? result.generatedTestCase : undefined),
        });
        errorRecords.push({
          id: randomUUID(),
          type: parsedError.type,
          message: parsedError.message,
          callLog: parsedError.callLog,
          callStack: parsedError.callStack,
          testAssertion: parsedError.testAssertion,
          expectedPattern: parsedError.expectedPattern,
          receivedString: parsedError.receivedString,
          location: `${parsedError.location.file}:${parsedError.location.line}`,
          resultId,
          ...(modalContext.rawLogs
            ? { rawLogs: modalContext.rawLogs }
            : {}),
          ...(modalContext.sourceSnippet
            ? {
                sourceSnippet: {
                  ...modalContext.sourceSnippet,
                } as Prisma.InputJsonObject,
              }
            : {}),
          ...(modalContext.generatedTestCase
            ? { generatedTestCase: modalContext.generatedTestCase }
            : {}),
        });
      }
    }

    for (const data of chunk(resultRecords)) {
      await client.result.createMany({ data });
    }
    for (const data of chunk(errorRecords)) {
      await client.resultError.createMany({ data });
    }
  },

  _getSpecKey(specData: TestSpec): string {
    if (specData.custom_id) {
      return specData.custom_id;
    }

    return specData.title.match(/C\d+/)?.[0] ?? specData.title;
  },

  /**
   * Find existing spec or create new one
   */
  async _findOrCreateSpec(
    specData: TestSpec,
    projectId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PrismaSpec> {
    const client = tx ?? dbClient;
    const specKey = this._getSpecKey(specData);

    let specRecord = await client.spec.findFirst({
      where: {
        key: specKey,
        AND: { projectId },
      },
    });

    if (!specRecord) {
      specRecord = await client.spec.create({
        data: {
          key: specKey,
          file: specData.location?.file ?? "",
          title: specData.title,
          tags: normalizeJsonStringArray(specData.tags),
          annotations: (Array.isArray(specData.annotations)
            ? specData.annotations
            : []) as Prisma.InputJsonValue,
          projectId: projectId ?? DEFAULT_PROJECT_ID,
        },
      });

      logger.info(`Created spec record: ${specRecord.id}`);
    }

    return specRecord;
  },

  /**
   * Process all results for a spec
   */
  async _processSpecResults(
    spec: TestSpec,
    specRecord: PrismaSpec,
    executionRecord: PrismaExecution,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (!spec.results?.length) {
      throw new Error(`Spec (#${specRecord.id}) report has no results data`);
    }

    for (const result of spec.results) {
      // Analysis is now always done post-persist for both CTRF and Playwright
      await this._createResultRecord(result, specRecord, executionRecord, tx);
    }
  },

  /**
   * Create a result record with error handling
   */
  async _createResultRecord(
    resultData: TestResult,
    specRecord: PrismaSpec,
    executionRecord: PrismaExecution,
    tx?: Prisma.TransactionClient,
  ): Promise<PrismaResult> {
    const client = tx ?? dbClient;
    // Check if result already exists
    let resultRecord = await client.result.findFirst({
      where: {
        specId: specRecord.id,
        executionId: executionRecord.id,
        startTime: new Date(resultData.startTime),
      },
    });

    if (resultRecord) {
      return resultRecord as PrismaResult; // Already exists, skip
    }

    const recordData: ResultCreateInput = {
      reportPortalLink: resultData.reportPortalLink ?? null,
      retry: resultData.retry ?? 0,
      status: resultData.status,
      duration: resultData.duration,
      startTime: new Date(resultData.startTime),
      spec: {
        connect: {
          id: specRecord.id,
        },
      },
      execution: {
        connect: {
          id: executionRecord.id,
        },
      },
    };

    // Handle error data if present
    const orderedErrors = getOrderedErrors(resultData);
    if (orderedErrors.length > 0) {
      const errorRecords = await Promise.all(
        orderedErrors.map((error, index) =>
          this._createErrorRecord(
            error,
            {
              logs: error.rawLogs ?? error.logs ?? (index === 0 ? resultData.logs : undefined),
              sourceSnippet:
                error.sourceSnippet ?? (index === 0 ? resultData.sourceSnippet : undefined),
              generatedTestCase:
                error.generatedTestCase ??
                (index === 0 ? resultData.generatedTestCase : undefined),
            },
            tx,
          ),
        ),
      );
      recordData.errors = {
        connect: errorRecords.map(({ id }) => ({ id })),
      };
    }

    resultRecord = await client.result.create({
      data: recordData,
    });

    logger.info(`Created result record: ${resultRecord.id}`);
    return resultRecord as PrismaResult;
  },

  /**
   * Create an error record from error data
   */
  async _createErrorRecord(
    errorData: ErrorData,
    modalContextInput: Pick<
      TestResult,
      "logs" | "sourceSnippet" | "generatedTestCase"
    > = {},
    tx?: Prisma.TransactionClient,
  ): Promise<PrismaResultError> {
    const client = tx ?? dbClient;
    const parsedError = parseStackTrace(errorData);
    const {
      type,
      message,
      callLog,
      callStack,
      testAssertion,
      expectedPattern,
      receivedString,
      location,
    } = parsedError;
    const modalContext = normalizeResultErrorModalContext(modalContextInput);

    const errorRecord = await client.resultError.create({
      data: {
        type,
        message,
        callLog,
        callStack,
        testAssertion,
        expectedPattern,
        receivedString,
        location: `${location.file}:${location.line}`,
        ...(modalContext.rawLogs ? { rawLogs: modalContext.rawLogs } : {}),
        ...(modalContext.sourceSnippet
          ? {
              sourceSnippet: {
                ...modalContext.sourceSnippet,
              } as Prisma.InputJsonObject,
            }
          : {}),
        ...(modalContext.generatedTestCase
          ? { generatedTestCase: modalContext.generatedTestCase }
          : {}),
      },
    });

    logger.info(`Created error record: ${errorRecord.id}`);
    return errorRecord as PrismaResultError;
  },
};
