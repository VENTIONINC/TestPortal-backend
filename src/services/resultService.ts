// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import {
  resultModel,
  type ResultFilters,
  type AnalysisExportFilters,
  type AnalysisExportRow,
} from "@/models/resultModel";
import type {
  AnalysisExportMetadata,
  AnalysisExportParams,
  AnalysisExportRecord,
  GetResultsParams,
  GetResultsStatsParams,
  ResultsStats,
  ResultWithRelations,
} from "@/types";
import { dashboardService } from "@/services/dashboardService";
import {
  S3ArtifactConfigurationError,
  s3ArtifactService,
} from "@/services/s3ArtifactService";
import getLogger from "@/lib/logger";
import { dbClient } from "@/prisma/client";

const logger = getLogger("result-service");

interface GetResultsResponse {
  results: ResultWithRelations[];
  total: number;
  page: number;
  totalPages: number;
}

interface SignedArtifactResponse {
  provider: "s3";
  url: string;
  expiresAt: string;
}

export class ResultArtifactNotFoundError extends Error {
  constructor(message = "Result artifact not found") {
    super(message);
    this.name = "ResultArtifactNotFoundError";
  }
}

const shapeResultArtifactSummary = (
  result: ResultWithRelations,
): ResultWithRelations => {
  const shaped = { ...result };

  if (result.artifactProvider === "s3" && result.artifactObjectKey) {
    shaped.artifact = {
      provider: "s3",
      available: true,
    };
  }

  delete shaped.artifactProvider;
  delete shaped.artifactObjectKey;

  return shaped;
};

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
      results: results.map(shapeResultArtifactSummary),
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

    const resultRecord = await resultModel.findById(
      resultId,
      projectId,
      dbClient,
    );

    if (!resultRecord) {
      throw new Error(`Result with ID ${resultId} not found`);
    }

    return shapeResultArtifactSummary(resultRecord);
  },

  async getSignedArtifactUrl(
    resultId: number | string,
    projectId: string,
  ): Promise<SignedArtifactResponse> {
    if (!resultId) {
      throw new Error("Result ID is required");
    }

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const artifact = await resultModel.findArtifactById(
      resultId,
      projectId,
      dbClient,
    );

    if (!artifact) {
      const resultExists = await resultModel.existsById(resultId, dbClient);

      if (resultExists) {
        throw new Error("Result artifact access denied");
      }

      throw new ResultArtifactNotFoundError();
    }

    if (
      artifact.artifactProvider !== "s3" ||
      !artifact.artifactObjectKey
    ) {
      throw new ResultArtifactNotFoundError();
    }

    const signedUrl = await s3ArtifactService.createSignedArtifactUrl(
      artifact.artifactObjectKey,
    );

    return {
      provider: "s3",
      ...signedUrl,
    };
  },

  isArtifactConfigurationError(error: unknown): boolean {
    return error instanceof S3ArtifactConfigurationError;
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
      (analysisData.analysisConfidence < 1 ||
        analysisData.analysisConfidence > 5)
    ) {
      throw new Error("Confidence must be between 1 and 5");
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

  async updateAnalysisFeedback(
    resultId: number | string,
    feedbackData: {
      analysisFeedbackCategory?: string;
      analysisFeedbackConfidence?: number;
      analysisFeedbackConclusion?: string;
    },
    reviewedById: string,
  ): Promise<ResultWithRelations> {
    if (!resultId) {
      throw new Error("Result ID is required");
    }

    if (!reviewedById) {
      throw new Error("Reviewer ID is required");
    }

    if (
      feedbackData.analysisFeedbackCategory &&
      !["bug", "infra", "performance", "script", "other"].includes(
        feedbackData.analysisFeedbackCategory,
      )
    ) {
      throw new Error(
        "Invalid analysis feedback category. Must be one of: bug, infra, performance, script, other",
      );
    }

    if (
      feedbackData.analysisFeedbackConfidence !== undefined &&
      (!Number.isInteger(feedbackData.analysisFeedbackConfidence) ||
        feedbackData.analysisFeedbackConfidence < 1 ||
        feedbackData.analysisFeedbackConfidence > 5)
    ) {
      throw new Error("Feedback confidence must be an integer between 1 and 5");
    }

    const hasFeedbackFields =
      feedbackData.analysisFeedbackCategory !== undefined ||
      feedbackData.analysisFeedbackConfidence !== undefined ||
      feedbackData.analysisFeedbackConclusion !== undefined;

    if (!hasFeedbackFields) {
      throw new Error(
        "At least one feedback field must be provided (analysisFeedbackCategory, analysisFeedbackConfidence, analysisFeedbackConclusion)",
      );
    }

    const result = await dbClient.$transaction(async (tx) => {
      const updatedResult = await resultModel.updateAnalysisFeedback(
        resultId,
        {
          ...feedbackData,
          analysisReviewedAt: new Date(),
          analysisReviewedById: reviewedById,
        },
        tx,
      );

      if (!updatedResult) {
        throw new Error(`Result with ID ${resultId} not found`);
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

  async exportAnalysisJsonl(
    params: AnalysisExportParams,
  ): Promise<{ content: string }> {
    const { projectId, dateFrom, dateTo } = params;

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const parseDate = (value: string, label: string): Date => {
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        throw new Error(`${label} is invalid`);
      }
      return parsed;
    };

    const isDateOnly = (value: string): boolean =>
      /^\d{4}-\d{2}-\d{2}$/.test(value);

    const parsedFrom = parseDate(dateFrom, "dateFrom");
    const baseTo = parseDate(dateTo, "dateTo");
    const parsedTo = isDateOnly(dateTo)
      ? new Date(baseTo.getFullYear(), baseTo.getMonth(), baseTo.getDate() + 1)
      : baseTo;

    const filters: AnalysisExportFilters = {
      projectId,
      dateFrom: parsedFrom,
      dateTo: parsedTo,
    };

    const rows = await resultModel.findForAnalysisExport(filters);

    const metadata: AnalysisExportMetadata = {
      type: "metadata",
      schemaVersion: "1.0",
      projectId,
      dateFrom: parsedFrom.toISOString(),
      dateTo: parsedTo.toISOString(),
      generatedAt: new Date().toISOString(),
    };

    const parseTags = (tags: string): string | string[] => {
      try {
        const parsed = JSON.parse(tags);
        return Array.isArray(parsed) ? parsed : tags;
      } catch {
        return tags;
      }
    };

    const records: AnalysisExportRecord[] = rows.map(
      (row: AnalysisExportRow): AnalysisExportRecord => {
        const finalCategory =
          row.analysisFeedbackCategory ?? row.analysisCategory ?? null;
        const finalConfidence =
          row.analysisFeedbackConfidence ?? row.analysisConfidence ?? null;
        const finalConclusion =
          row.analysisFeedbackConclusion ?? row.analysisConclusion ?? null;

        return {
          type: "result",
          resultId: row.id,
          startTime: row.startTime.toISOString(),
          status: row.status,
          duration: row.duration,
          retry: row.retry,
          reportPortalLink: row.reportPortalLink,
          spec: {
            id: row.spec.id,
            key: row.spec.key,
            file: row.spec.file,
            title: row.spec.title,
            tags: parseTags(row.spec.tags),
          },
          execution: {
            id: row.execution.id,
            environment: row.execution.environment,
            type: row.execution.type,
            name: row.execution.name,
            version: row.execution.version,
            startedAt: row.execution.startedAt.toISOString(),
            createdAt: row.execution.createdAt.toISOString(),
          },
          ai: {
            status: row.analysisStatus,
            category: row.analysisCategory,
            confidence: row.analysisConfidence,
            conclusion: row.analysisConclusion,
            errorQuality: row.analysisErrorQuality,
            errorQualityConclusion: row.analysisErrorQualityConclusion,
          },
          feedback: {
            category: row.analysisFeedbackCategory ?? null,
            confidence: row.analysisFeedbackConfidence ?? null,
            conclusion: row.analysisFeedbackConclusion ?? null,
            reviewedAt: row.analysisReviewedAt
              ? row.analysisReviewedAt.toISOString()
              : null,
            reviewedById: row.analysisReviewedById ?? null,
          },
          final: {
            category: finalCategory,
            confidence: finalConfidence,
            conclusion: finalConclusion,
          },
        };
      },
    );

    const lines = [
      JSON.stringify(metadata),
      ...records.map((record) => JSON.stringify(record)),
    ];

    return {
      content: `${lines.join("\n")}\n`,
    };
  },
};
