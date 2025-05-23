import getLogger from "../lib/logger.js";
import { dbClient } from "../../prisma/client.js";
import { parseStackTrace } from "../lib/parse-error.js";

const logger = getLogger("jsonReportService");

export const jsonReportService = {
  /**
   * Process a JSON report and create/update all related database records
   * @param {Object} reportData - The JSON report data
   * @returns {Object} Processing result with success status
   */
  async processReport(reportData) {
    if (!reportData) {
      throw new Error("Report data is required");
    }

    const { runId, env, version, stats, tests } = reportData;

    if (!runId) {
      throw new Error("Report must include a runId");
    }

    // Create or find execution record
    let executionRecord = await this._findOrCreateExecution({
      runId,
      env,
      version,
      stats,
    });

    if (!tests || !tests.length) {
      throw new Error(`Execution #${executionRecord.id} has no specs`);
    }

    // Process all test specs
    await this._processSpecs(tests, executionRecord);

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
   * @private
   */
  async _findOrCreateExecution({ runId, env, version, stats }) {
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
          startedAt: stats?.startTime,
        },
      });

      logger.info(`Created new execution record: ${executionRecord.id}`);
    }

    return executionRecord;
  },

  /**
   * Process all test specs and their results
   * @private
   */
  async _processSpecs(specs, executionRecord) {
    for (const spec of specs) {
      if (!spec.title) {
        throw new Error(`Spec data is missing title: ${spec.location?.file}`);
      }

      const specRecord = await this._findOrCreateSpec(spec);
      await this._processSpecResults(spec, specRecord, executionRecord);
    }
  },

  /**
   * Find existing spec or create new one
   * @private
   */
  async _findOrCreateSpec(specData) {
    let [specKey] = specData.title.match(/C\d+/) || [];

    if (!specKey) {
      specKey = specData.custom_id;
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
          file: specData.location?.file,
          title: specData.title,
          tags: JSON.stringify(specData.tags || []),
          annotations: JSON.stringify(specData.annotations || []),
        },
      });

      logger.info(`Created spec record: ${specRecord.id}`);
    }

    return specRecord;
  },

  /**
   * Process all results for a spec
   * @private
   */
  async _processSpecResults(spec, specRecord, executionRecord) {
    if (!spec.results || !spec.results.length) {
      throw new Error(`Spec (#${specRecord.id}) report has no results data`);
    }

    for (const result of spec.results) {
      await this._createResultRecord(result, specRecord, executionRecord);
    }
  },

  /**
   * Create a result record with error handling
   * @private
   */
  async _createResultRecord(resultData, specRecord, executionRecord) {
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

    const recordData = {
      allureLink: resultData.allureLink,
      retry: resultData.retry,
      status: resultData.status,
      duration: resultData.duration,
      startTime: resultData.startTime,
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
   * @private
   */
  async _createErrorRecord(errorData) {
    const parsedError = parseStackTrace(errorData);

    const errorRecord = await dbClient.resultError.create({
      data: {
        type: parsedError.type,
        message: parsedError.message,
        callLog: JSON.stringify(parsedError.callLog || []),
        callStack: JSON.stringify(parsedError.callStack || []),
        testAssertion: parsedError.testAssertion,
        expectedPattern: parsedError.expectedPattern,
        receivedString: parsedError.receivedString,
        location: parsedError.location
          ? `${parsedError.location.file}:${parsedError.location.line}`
          : "",
      },
    });

    return errorRecord;
  },
};
