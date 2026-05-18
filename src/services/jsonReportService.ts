import getLogger from "@/lib/logger";
import { dbClient } from "@/prisma/client";
import { Prisma } from "@prisma/client";
import { parseStackTrace } from "@/lib/parse-error";
import {
  generateFallbackIdentifier,
  type IdentifierStrategy,
} from "@/lib/executionIdentifiers";
import { playwrightArtifactService } from "@/services/playwrightArtifactService";
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
  artifactProvider?: string | null;
  artifactObjectKey?: string | null;
  spec: { connect: { id: string } }; // UUID reference to Spec
  execution: { connect: { id: string } }; // UUID reference to Execution
  errors?: { connect: { id: string } }; // UUID reference to ResultError
}

const logger = getLogger("json-report-service");

export interface ReportData {
  runId?: string;
  env?: string;
  version?: string;
  provider: string;
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
  workerIndex: number;
  attachments?: Array<{
    name?: string;
    contentType?: string;
    path?: string;
  }>;
}

interface ErrorData {
  message: string;
  stack: string;
  location: { file: string; line: number };
}

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
      stats?: { startTime?: string | Date };
      projectId: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<PrismaExecution> {
    const { runId, env, version, provider, stats, projectId } = params;
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
          type: "nightly",
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
    for (const spec of specs) {
      if (!spec.title) {
        throw new Error(`Spec data is missing title: ${spec.location?.file}`);
      }

      const specRecord = await this._findOrCreateSpec(spec, projectId, tx);
      await this._processSpecResults(spec, specRecord, executionRecord, tx);
    }
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
    let specKey = "";
    const titleMatch = specData.title.match(/C\d+/);

    if (titleMatch) {
      specKey = titleMatch[0];
    } else if (specData.custom_id) {
      specKey = specData.custom_id;
    } else {
      specKey = specData.title; // fallback to title
    }

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
          tags: JSON.stringify(specData.tags ?? []),
          annotations: JSON.stringify(specData.annotations ?? []),
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
      await this._createResultRecord(
        result,
        spec,
        specRecord,
        executionRecord,
        tx,
      );
    }
  },

  /**
   * Create a result record with error handling
   */
  async _createResultRecord(
    resultData: TestResult,
    specData: TestSpec,
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

    const artifactReference = playwrightArtifactService.extractS3ArtifactReference(
      specData,
      resultData,
    );

    if (artifactReference) {
      recordData.artifactProvider = artifactReference.provider;
      recordData.artifactObjectKey = artifactReference.objectKey;
    }

    // Handle error data if present
    if (resultData.error) {
      const errorRecord = await this._createErrorRecord(resultData.error, tx);
      recordData.errors = {
        connect: {
          id: errorRecord.id,
        },
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

    const errorRecord = await client.resultError.create({
      data: {
        type,
        message,
        callLog: JSON.stringify(callLog),
        callStack: JSON.stringify(callStack),
        testAssertion,
        expectedPattern,
        receivedString,
        location: `${location.file}:${location.line}`,
      },
    });

    logger.info(`Created error record: ${errorRecord.id}`);
    return errorRecord as PrismaResultError;
  },
};
