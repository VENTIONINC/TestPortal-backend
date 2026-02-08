import { mcpResultHandler } from "@/handlers/mcpResultHandler";
import { createSuccessResponse, createMcpTool } from "@/mcp/helpers/mcpHelpers";
import {
  getResultsSchema,
  getResultByIdSchema,
  getResultsStatsSchema,
  updateResultAnalysisSchema,
  updateResultAnalysisFeedbackSchema,
  deleteResultSchema,
} from "@/mcp/schemas/resultSchemas";
import type {
  GetResultsParams,
  GetResultsStatsParams,
  MCPToolResponse,
} from "@/types";

interface GetResultByIdParams {
  resultId: string;
  projectId: string;
}

interface UpdateResultAnalysisParams {
  resultId: string;
  analysisStatus?: string;
  analysisCategory?: string;
  analysisConfidence?: number;
  analysisConclusion?: string;
}

interface UpdateResultAnalysisFeedbackParams {
  resultId: string;
  analysisFeedbackCategory?: string;
  analysisFeedbackConfidence?: number;
  analysisFeedbackConclusion?: string;
}

interface DeleteResultParams {
  resultId: string;
  projectId: string;
}

export const getResults = createMcpTool(
  "get-results",
  "Retrieve test execution results with comprehensive filtering options for analysis, reporting, and debugging",
  getResultsSchema,
  async (params: GetResultsParams): Promise<MCPToolResponse> => {
    const results = await mcpResultHandler.getResults(params);
    return createSuccessResponse(results);
  },
  "fetching results",
);

export const getResultById = createMcpTool(
  "get-result-by-id",
  "Retrieve complete details for a specific test result including error information, call stacks, and execution data",
  getResultByIdSchema,
  async (params: GetResultByIdParams): Promise<MCPToolResponse> => {
    const { resultId, projectId } = params;
    const result = await mcpResultHandler.getResultById(resultId, projectId);
    return createSuccessResponse(result);
  },
  "fetching result",
);

export const getResultsStats = createMcpTool(
  "get-results-stats",
  "Retrieve statistical analysis of test results including status counts, entity counts, and top errors/issues for specified dates",
  getResultsStatsSchema,
  async (params: GetResultsStatsParams): Promise<MCPToolResponse> => {
    const stats = await mcpResultHandler.getResultsStats(params);
    return createSuccessResponse(stats);
  },
  "fetching results statistics",
);

export const updateResultAnalysis = createMcpTool(
  "update-result-analysis",
  "Update analysis fields on a result such as status, category, confidence, and conclusion",
  updateResultAnalysisSchema,
  async (params: UpdateResultAnalysisParams): Promise<MCPToolResponse> => {
    const { resultId, ...analysisData } = params;
    const updated = await mcpResultHandler.updateAnalysis(
      resultId,
      analysisData,
    );
    return createSuccessResponse(updated, "Result analysis updated successfully:");
  },
  "updating result analysis",
);

export const updateResultAnalysisFeedback = createMcpTool(
  "update-result-analysis-feedback",
  "Update analysis feedback fields on a result with reviewer context",
  updateResultAnalysisFeedbackSchema,
  async (
    params: UpdateResultAnalysisFeedbackParams,
    context,
  ): Promise<MCPToolResponse> => {
    if (!context?.mcpUserId) {
      throw new Error("MCP user ID is required");
    }

    const { resultId, ...feedbackData } = params;
    const updated = await mcpResultHandler.updateAnalysisFeedback(
      resultId,
      feedbackData,
      context.mcpUserId,
    );
    return createSuccessResponse(
      updated,
      "Result analysis feedback updated successfully:",
    );
  },
  "updating result analysis feedback",
);

export const deleteResult = createMcpTool(
  "delete-result",
  "Delete a result by ID and refresh related dashboard stats",
  deleteResultSchema,
  async (params: DeleteResultParams): Promise<MCPToolResponse> => {
    const { resultId, projectId } = params;
    await mcpResultHandler.deleteResult(resultId, projectId);
    return createSuccessResponse({ resultId, projectId }, "Result deleted successfully:");
  },
  "deleting result",
);

