import getLogger from "@/lib/logger";
import { dbClient } from "@/prisma/client";
import { parseStackTrace } from "@/lib/parse-error";
import type {
  PrismaExecution,
  PrismaSpec,
  PrismaResult,
  PrismaResultError,
} from "@/types";
import type { TestResultAnalysis } from "@/services/testAnalysisService";

interface ResultCreateInput {
  allureLink: string | null;
  retry: number;
  status: string;
  duration: number;
  startTime: Date;
  analysisStatus?: string;
  analysisCategory?: string;
  analysisConfidence?: number;
  analysisConclusion?: string;
  spec: { connect: { id: number } };
  execution: { connect: { id: number } };
  errors?: { connect: { id: number } };
}

const logger = getLogger("json-report-service");

interface ReportData {
  runId: string;
  env: string;
  version: string;
  stats?: {
    startTime?: string | Date;
  };
  tests: TestSpec[];
  analysis?: TestResultAnalysis[];
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
  allureLink?: string;
  retry: number;
  status: string;
  duration: number;
  startTime: string | Date;
  error?: ErrorData;
  workerIndex: number;
}

interface ErrorData {
  message: string;
  stack: string;
  location: { file: string; line: number };
}

interface ProcessReportResult {
  success: boolean;
  executionId: number;
  specsProcessed: number;
}

export const jsonReportService = {
  /**
   * Process a JSON report and create/update all related database records
   */
  async processReport(reportData: ReportData): Promise<ProcessReportResult> {
    if (!reportData) {
      throw new Error("Report data is required");
    }

    const { runId, env, version, stats, tests, analysis } = reportData;

    if (!runId) {
      throw new Error("Report must include a runId");
    }

    // Create or find execution record
    const executionRecord = await this._findOrCreateExecution({
      runId,
      env,
      version,
      ...(stats && { stats }),
    });

    if (!tests?.length) {
      throw new Error(`Execution #${executionRecord.id} has no specs`);
    }

    // Process all test specs
    await this._processSpecs(tests, executionRecord, analysis);

    logger.info(
      `Successfully processed report for execution #${executionRecord.id}`,
    );

    return {
      success: true,
      executionId: executionRecord.id,
      specsProcessed: tests.length,
    };
  },

  /**
   * Find existing execution or create new one
   */
  async _findOrCreateExecution(params: {
    runId: string;
    env: string;
    version: string;
    stats?: { startTime?: string | Date };
  }): Promise<PrismaExecution> {
    const { runId, env, version, stats } = params;

    let executionRecord = await dbClient.execution.findFirst({
      where: {
        name: runId,
      },
    });

    if (!executionRecord) {
      executionRecord = await dbClient.execution.create({
        data: {
          type: "nightly",
          name: runId,
          environment: env,
          version,
          startedAt: stats?.startTime ? new Date(stats.startTime) : new Date(),
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
    analysis?: TestResultAnalysis[],
  ): Promise<void> {
    for (const spec of specs) {
      if (!spec.title) {
        throw new Error(`Spec data is missing title: ${spec.location?.file}`);
      }

      const specRecord = await this._findOrCreateSpec(spec);
      await this._processSpecResults(
        spec,
        specRecord,
        executionRecord,
        analysis,
      );
    }
  },

  /**
   * Find existing spec or create new one
   */
  async _findOrCreateSpec(specData: TestSpec): Promise<PrismaSpec> {
    let specKey = "";
    const titleMatch = specData.title.match(/C\d+/);

    if (titleMatch) {
      specKey = titleMatch[0];
    } else if (specData.custom_id) {
      specKey = specData.custom_id;
    } else {
      specKey = specData.title; // fallback to title
    }

    let specRecord = await dbClient.spec.findFirst({
      where: {
        key: specKey,
      },
    });

    if (!specRecord) {
      specRecord = await dbClient.spec.create({
        data: {
          key: specKey,
          file: specData.location?.file ?? "",
          title: specData.title,
          tags: JSON.stringify(specData.tags ?? []),
          annotations: JSON.stringify(specData.annotations ?? []),
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
    analysis?: TestResultAnalysis[],
  ): Promise<void> {
    if (!spec.results?.length) {
      throw new Error(`Spec (#${specRecord.id}) report has no results data`);
    }

    for (const result of spec.results) {
      const resultAnalysis = analysis?.find(
        (analysis) => analysis.workerIndex === result.workerIndex,
      );

      await this._createResultRecord(
        result,
        specRecord,
        executionRecord,
        resultAnalysis,
      );
    }
  },

  /**
   * Create a result record with error handling
   */
  async _createResultRecord(
    resultData: TestResult,
    specRecord: PrismaSpec,
    executionRecord: PrismaExecution,
    analysis?: TestResultAnalysis,
  ): Promise<PrismaResult> {
    // Check if result already exists
    let resultRecord = await dbClient.result.findFirst({
      where: {
        specId: specRecord.id,
        executionId: executionRecord.id,
        startTime: new Date(resultData.startTime),
      },
    });

    if (resultRecord) {
      return resultRecord; // Already exists, skip
    }

    const recordData: ResultCreateInput = {
      allureLink: resultData.allureLink ?? null,
      retry: resultData.retry,
      status: resultData.status,
      duration: resultData.duration,
      startTime: new Date(resultData.startTime),
      // Add analysis fields if available
      ...(analysis && {
        analysisStatus: analysis.status,
        analysisCategory: analysis.category,
        analysisConfidence: analysis.confidence,
        analysisConclusion: analysis.conclusion,
      }),
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
    if (resultData.error) {
      const errorRecord = await this._createErrorRecord(resultData.error);
      recordData.errors = {
        connect: {
          id: errorRecord.id,
        },
      };
    }

    resultRecord = await dbClient.result.create({
      data: recordData,
    });

    logger.info(`Created result record: ${resultRecord.id}`);
    return resultRecord;
  },

  /**
   * Create an error record from error data
   */
  async _createErrorRecord(errorData: ErrorData): Promise<PrismaResultError> {
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

    const errorRecord = await dbClient.resultError.create({
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
    return errorRecord;
  },
};
