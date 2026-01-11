import { resultModel, type ResultFilters } from "@/models/resultModel";
import type {
  GetResultsParams,
  GetResultsStatsParams,
  ResultsStats,
  ResultWithRelations,
} from "@/types";
import { dashboardService } from "@/services/dashboardService";
import getLogger from "@/lib/logger";
import { dbClient } from "@/prisma/client";

const logger = getLogger("result-service");

interface GetResultsResponse {
  results: ResultWithRelations[];
  total: number;
  page: number;
  totalPages: number;
}

export const resultService = {
  async getResults(params: GetResultsParams): Promise<GetResultsResponse> {
    const {
      projectId,
      tag,
      specId,
      specFile,
      specName,
      environment,
      type,
      status,
      reviewStatus,
      errorMessage,
      issueName,
      from,
      to,
      page = 1,
      limit = 1000,
    } = params;

    // Validate required projectId parameter
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    // Build filters object, always include required projectId
    const filters: ResultFilters = {
      projectId,
    };
    if (tag) filters.tag = tag;
    if (specId) filters.specId = specId;
    if (specFile) filters.specFile = specFile;
    if (specName) filters.specName = specName;
    if (environment) filters.environment = environment;
    if (type) filters.type = type;
    if (status) filters.status = status;
    if (reviewStatus) filters.reviewStatus = reviewStatus;
    if (errorMessage) filters.errorMessage = errorMessage;
    if (issueName) filters.issueName = issueName;
    if (from) filters.from = from;
    if (to) filters.to = to;

    const results = await resultModel.findMany(filters, page, limit);
    const totalResults = await resultModel.count(filters);

    // Process results for response
    for (const result of results) {
      // de-serialize stacks
      if (result.errors?.length) {
        for (const error of result.errors) {
          try {
            if (typeof error.callLog === "string") {
              error.callLog = JSON.parse(error.callLog);
            }
            if (typeof error.callStack === "string") {
              error.callStack = JSON.parse(error.callStack);
            }
          } catch (e) {
            // Handle malformed JSON gracefully
            console.warn(
              `Failed to parse error data for result ${result.id}:`,
              e,
            );
          }
        }
      }

      // de-serialize string arrays
      try {
        if (typeof result.spec.tags === "string") {
          result.spec.tags = JSON.parse(result.spec.tags);
        }
        if (
          typeof result.spec.annotations === "string" &&
          result.spec.annotations
        ) {
          result.spec.annotations = JSON.parse(result.spec.annotations);
        }
      } catch (e) {
        // Handle malformed JSON gracefully
        console.warn(`Failed to parse spec data for result ${result.id}:`, e);
      }
    }

    return {
      results,
      total: totalResults,
      page: Number(page),
      totalPages: Math.ceil(totalResults / limit),
    };
  },

  async getResultById(
    resultId: number | string,
    projectId: string,
  ): Promise<ResultWithRelations> {
    if (!resultId) {
      throw new Error("Result ID is required");
    }

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const resultRecord = await resultModel.findById(resultId, projectId, dbClient);

    if (!resultRecord) {
      throw new Error(`Result with ID ${resultId} not found`);
    }

    return resultRecord;
  },

  async getResultsStats(params: GetResultsStatsParams): Promise<ResultsStats> {
    const { projectId, dates } = params;

    // Validate required projectId parameter
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const stats = await resultModel.getStats({ projectId, dates });

    return stats;
  },

  async updateAnalysis(
    resultId: number | string,
    analysisData: {
      analysisStatus?: string;
      analysisCategory?: string;
      analysisConfidence?: number;
      analysisConclusion?: string;
    },
  ): Promise<ResultWithRelations> {
    if (!resultId) {
      throw new Error("Result ID is required");
    }

    // Validate analysis data
    if (
      analysisData.analysisCategory &&
      !["bug", "infra", "performance", "script", "other"].includes(
        analysisData.analysisCategory,
      )
    ) {
      throw new Error(
        "Invalid analysis category. Must be one of: bug, infra, performance, script, other",
      );
    }

    if (
      analysisData.analysisConfidence !== undefined &&
      (analysisData.analysisConfidence < 0 ||
        analysisData.analysisConfidence > 1)
    ) {
      throw new Error("Confidence must be between 0 and 1");
    }

    const result = await dbClient.$transaction(async (tx) => {
      const updatedResult = await resultModel.updateAnalysis(
        resultId,
        analysisData,
        tx,
      );

      if (!updatedResult) {
        throw new Error(`Result with ID ${resultId} not found`);
      }

      // Refresh dashboard stats because analysis category/status might have changed
      if (updatedResult.execution) {
        try {
          await dashboardService.refreshDailyStats(
            updatedResult.execution.projectId,
            updatedResult.execution.createdAt,
            updatedResult.execution.environment,
            updatedResult.execution.type,
            tx,
          );
        } catch (error) {
          logger.error(
            `Failed to refresh dashboard stats in updateAnalysis: ${error}`,
          );
          throw error;
        }
      }

      return updatedResult;
    });

    return result;
  },

  async deleteResult(resultId: string, projectId: string): Promise<void> {
    if (!resultId) {
      throw new Error("Result ID is required");
    }

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    await dbClient.$transaction(async (tx) => {
      // Fetch result with context before deletion
      const result = await resultModel.findById(resultId, projectId, tx);

      await resultModel.delete(resultId, projectId, tx);

      if (result?.execution) {
        try {
          await dashboardService.refreshDailyStats(
            result.execution.projectId,
            result.execution.createdAt,
            result.execution.environment,
            result.execution.type,
            tx,
          );
        } catch (error) {
          logger.error(
            `Failed to refresh dashboard stats in deleteResult: ${error}`,
          );
          throw error;
        }
      }
    });
  },
};
