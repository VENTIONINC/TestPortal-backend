import { resultService } from "@/services/resultService";
import type {
  GetResultsParams,
  GetResultsStatsParams,
  ResultsStats,
  ResultWithRelations,
} from "@/types";

interface GetResultsResponse {
  results: ResultWithRelations[];
  total: number;
  page: number;
  totalPages: number;
}

interface UpdateAnalysisData {
  analysisStatus?: string;
  analysisCategory?: string;
  analysisConfidence?: number;
  analysisConclusion?: string;
}

interface UpdateAnalysisFeedbackData {
  analysisFeedbackCategory?: string;
  analysisFeedbackConfidence?: number;
  analysisFeedbackConclusion?: string;
}

export const mcpResultHandler = {
  async getResults(params?: GetResultsParams): Promise<GetResultsResponse> {
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
    } = params ?? {};

    // Validate required projectId parameter
    if (!projectId) {
      throw new Error("Project ID is required for retrieving results");
    }

    // Build parameters object, filtering out undefined values
    const resultParams: GetResultsParams = {
      projectId,
    };
    if (tag) resultParams.tag = tag;
    if (specId) resultParams.specId = specId;
    if (specFile) resultParams.specFile = specFile;
    if (specName) resultParams.specName = specName;
    if (environment) resultParams.environment = environment;
    if (type) resultParams.type = type;
    if (status) resultParams.status = status;
    if (reviewStatus) resultParams.reviewStatus = reviewStatus;
    if (errorMessage) resultParams.errorMessage = errorMessage;
    if (issueName) resultParams.issueName = issueName;
    if (from) resultParams.from = from;
    if (to) resultParams.to = to;
    if (page) resultParams.page = page;
    if (limit) resultParams.limit = limit;

    return await resultService.getResults(resultParams);
  },

  async getResultById(resultId: string, projectId: string): Promise<ResultWithRelations | null> {
    return await resultService.getResultById(resultId, projectId);
  },

  async getResultsStats(params?: GetResultsStatsParams): Promise<ResultsStats> {
    const { projectId, dates } = params ?? {};

    // Validate required projectId parameter
    if (!projectId) {
      throw new Error(
        "Project ID is required for retrieving results statistics",
      );
    }

    return await resultService.getResultsStats({
      projectId,
      ...(dates && { dates }),
    });
  },

  async updateAnalysis(
    resultId: string,
    analysisData: UpdateAnalysisData,
  ): Promise<ResultWithRelations> {
    return await resultService.updateAnalysis(resultId, analysisData);
  },

  async updateAnalysisFeedback(
    resultId: string,
    feedbackData: UpdateAnalysisFeedbackData,
    reviewerId: string,
  ): Promise<ResultWithRelations> {
    return await resultService.updateAnalysisFeedback(
      resultId,
      feedbackData,
      reviewerId,
    );
  },

  async deleteResult(resultId: string, projectId: string): Promise<void> {
    await resultService.deleteResult(resultId, projectId);
  },
};
