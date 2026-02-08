import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import type { MCPToolResponse } from "@/types";
import {
  buildSchema,
  defaultContext,
  expectErrorResponse,
  parseResponseJson,
  type ZodShape,
} from "@/test-utils/mcpContractTestUtils";

jest.mock("@/handlers/mcpResultHandler", () => ({
  mcpResultHandler: {
    getResults: jest.fn(),
    getResultById: jest.fn(),
    updateAnalysis: jest.fn(),
    updateAnalysisFeedback: jest.fn(),
  },
}));

import {
  getResults,
  getResultById,
  updateResultAnalysis,
  updateResultAnalysisFeedback,
} from "@/mcp/tools/results";
import { mcpResultHandler } from "@/handlers/mcpResultHandler";

const mockedResultHandler = mcpResultHandler as jest.Mocked<
  typeof mcpResultHandler
>;

describe("MCP results contracts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("get-results", () => {
    it("accepts required fields and rejects missing projectId", () => {
      const [, , schema] = getResults;
      const zodSchema = buildSchema(schema as ZodShape);

      expect(zodSchema.safeParse({ projectId: "proj-1" }).success).toBe(true);
      expect(zodSchema.safeParse({}).success).toBe(false);
    });

    it("returns success response with stable shape", async () => {
      const [, , , handler] = getResults;
      const payload = { projectId: "proj-1" };
      const results = { results: [], total: 0, page: 1, totalPages: 0 };
      mockedResultHandler.getResults.mockResolvedValue(results);

      const response = (await handler(
        payload,
        defaultContext,
      )) as MCPToolResponse;
      const parsed = parseResponseJson(response);

      expect(response).toEqual({
        content: [
          {
            type: "text",
            text: expect.any(String),
          },
        ],
      });
      expect(parsed).toEqual(results);
      expect(mcpResultHandler.getResults).toHaveBeenCalledWith(payload);
    });

    it("returns error response when handler fails", async () => {
      const [, , , handler] = getResults;
      const payload = { projectId: "proj-1" };
      mockedResultHandler.getResults.mockRejectedValue(
        new Error("Project ID is required for retrieving results"),
      );

      const response = (await handler(
        payload,
        defaultContext,
      )) as MCPToolResponse;

      expectErrorResponse(
        response,
        "fetching results",
        "Project ID is required for retrieving results",
      );
    });
  });

  describe("get-result-by-id", () => {
    it("requires resultId and projectId", () => {
      const [, , schema] = getResultById;
      const zodSchema = buildSchema(schema as ZodShape);

      expect(
        zodSchema.safeParse({ resultId: "result-1", projectId: "proj-1" })
          .success,
      ).toBe(true);
      expect(zodSchema.safeParse({ resultId: "result-1" }).success).toBe(false);
    });

    it("returns success response with stable shape", async () => {
      const [, , , handler] = getResultById;
      const payload = { resultId: "result-1", projectId: "proj-1" };
      const result = { id: "result-1" };
      mockedResultHandler.getResultById.mockResolvedValue(result as never);

      const response = (await handler(
        payload,
        defaultContext,
      )) as MCPToolResponse;
      const parsed = parseResponseJson(response);

      expect(response.content?.[0]?.type).toBe("text");
      expect(parsed).toEqual(result);
      expect(mcpResultHandler.getResultById).toHaveBeenCalledWith(
        payload.resultId,
        payload.projectId,
      );
    });

    it("returns error response when handler fails", async () => {
      const [, , , handler] = getResultById;
      const payload = { resultId: "result-1", projectId: "proj-1" };
      mockedResultHandler.getResultById.mockRejectedValue(
        new Error("Result not found"),
      );

      const response = (await handler(
        payload,
        defaultContext,
      )) as MCPToolResponse;

      expectErrorResponse(response, "fetching result", "Result not found");
    });
  });

  describe("update-result-analysis", () => {
    it("enforces analysisConfidence bounds and requires resultId", () => {
      const [, , schema] = updateResultAnalysis;
      const zodSchema = buildSchema(schema as ZodShape);

      expect(zodSchema.safeParse({ resultId: "result-1" }).success).toBe(true);
      expect(
        zodSchema.safeParse({ resultId: "result-1", analysisConfidence: 1.2 })
          .success,
      ).toBe(false);
    });

    it("returns success response with stable shape", async () => {
      const [, , , handler] = updateResultAnalysis;
      const payload = { resultId: "result-1", analysisStatus: "reviewed" };
      const updated = { id: "result-1", analysisStatus: "reviewed" };
      mockedResultHandler.updateAnalysis.mockResolvedValue(updated as never);

      const response = (await handler(
        payload,
        defaultContext,
      )) as MCPToolResponse;
      const parsed = parseResponseJson(response);

      expect(response.content?.[0]?.type).toBe("text");
      expect(parsed).toEqual(updated);
      expect(mcpResultHandler.updateAnalysis).toHaveBeenCalledWith(
        payload.resultId,
        { analysisStatus: payload.analysisStatus },
      );
    });

    it("returns error response when handler fails", async () => {
      const [, , , handler] = updateResultAnalysis;
      const payload = { resultId: "result-1", analysisStatus: "reviewed" };
      mockedResultHandler.updateAnalysis.mockRejectedValue(
        new Error("Result not found"),
      );

      const response = (await handler(
        payload,
        defaultContext,
      )) as MCPToolResponse;

      expectErrorResponse(
        response,
        "updating result analysis",
        "Result not found",
      );
    });
  });

  describe("update-result-analysis-feedback", () => {
    it("enforces analysisFeedbackConfidence bounds and requires resultId", () => {
      const [, , schema] = updateResultAnalysisFeedback;
      const zodSchema = buildSchema(schema as ZodShape);

      expect(zodSchema.safeParse({ resultId: "result-1" }).success).toBe(true);
      expect(
        zodSchema.safeParse({
          resultId: "result-1",
          analysisFeedbackConfidence: -0.1,
        }).success,
      ).toBe(false);
    });

    it("returns success response with stable shape", async () => {
      const [, , , handler] = updateResultAnalysisFeedback;
      const payload = {
        resultId: "result-1",
        analysisFeedbackConclusion: "ok",
      };
      const updated = { id: "result-1", analysisFeedbackConclusion: "ok" };
      mockedResultHandler.updateAnalysisFeedback.mockResolvedValue(
        updated as never,
      );

      const response = (await handler(
        payload,
        defaultContext,
      )) as MCPToolResponse;
      const parsed = parseResponseJson(response);

      expect(response.content?.[0]?.type).toBe("text");
      expect(parsed).toEqual(updated);
      expect(mcpResultHandler.updateAnalysisFeedback).toHaveBeenCalledWith(
        payload.resultId,
        { analysisFeedbackConclusion: payload.analysisFeedbackConclusion },
        defaultContext.mcpUserId,
      );
    });

    it("returns error response when user context is missing", async () => {
      const [, , , handler] = updateResultAnalysisFeedback;
      const payload = {
        resultId: "result-1",
        analysisFeedbackConclusion: "ok",
      };

      const response = (await handler(payload)) as MCPToolResponse;

      expectErrorResponse(
        response,
        "updating result analysis feedback",
        "MCP user ID is required",
      );
    });
  });
});
