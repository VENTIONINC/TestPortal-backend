import { resultService } from "@/services/resultService";
import type {
  GetResultsParams,
  GetResultsStatsParams,
  ResultsStats,
  StructuredResultWithRelations,
} from "@/types";

interface GetResultsResponse {
  results: StructuredResultWithRelations[];
  total: number;
  page: number;
  totalPages: number;
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
    if (from) resultParams.from = from;
    if (to) resultParams.to = to;
    if (page) resultParams.page = page;
    if (limit) resultParams.limit = limit;

    return await resultService.getResults(resultParams);
  },

  async getResultById(
    resultId: string,
    projectId: string,
  ): Promise<StructuredResultWithRelations | null> {
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
};
