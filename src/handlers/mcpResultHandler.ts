import { resultService } from "@/services/resultService";
import type { GetResultsParams, ResultWithRelations } from "@/types";

interface GetResultsResponse {
  results: ResultWithRelations[];
  total: number;
  page: number;
  totalPages: number;
}

export const mcpResultHandler = {
  async getResults(params?: GetResultsParams): Promise<GetResultsResponse> {
    const {
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

    // Build parameters object, filtering out undefined values
    const resultParams: GetResultsParams = {};
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
    resultId: string | number,
  ): Promise<ResultWithRelations | null> {
    return await resultService.getResultById(resultId);
  },
};
