import getLogger from "@/lib/logger";
import OpenAI from "openai";
import { getTestAnalysisPrompt } from "@/prompts/test-analysis";

const logger = getLogger("test-analysis");
const openai = new OpenAI();

export interface TestAnalysisResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface TestResultAnalysis {
  id: string;
  status: "passed" | "failed";
  category?: "bug" | "infra" | "performance" | "script" | "other";
  confidence: number;
  conclusion: string;
}

export interface TestAnalysisRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  response_format?: {
    type: "json_schema";
    json_schema: {
      name: string;
      strict: boolean;
      schema: object;
    };
  };
}

export const testAnalysisService = {
  async analyzeTestResults(testResults: any[]): Promise<TestResultAnalysis[]> {
    try {
      const resultsToAnalyze = testResults;
      const systemPrompt = getTestAnalysisPrompt(resultsToAnalyze.length);
      const userPrompt = JSON.stringify(resultsToAnalyze, null, 2);

      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "test_analysis",
            strict: false,
            schema: {
              type: "object",
              properties: {
                results: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: {
                        type: "string",
                        description: "Test identifier extracted from test data",
                      },
                      status: {
                        type: "string",
                        enum: ["passed", "failed"],
                        description: "Test execution status",
                      },
                      category: {
                        type: "string",
                        enum: [
                          "bug",
                          "infra",
                          "performance",
                          "script",
                          "other",
                        ],
                        description: "Failure category (only for failed tests)",
                      },
                      confidence: {
                        type: "number",
                        minimum: 0.0,
                        maximum: 1.0,
                        description: "Confidence level of the analysis",
                      },
                      conclusion: {
                        type: "string",
                        description:
                          "A 2-3 sentence explanation of the analysis decision.",
                      },
                    },
                    required: ["id", "status", "confidence", "conclusion"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["results"],
              additionalProperties: false,
            },
          },
        },
      });

      const analysisContent = response.choices[0]?.message?.content;

      if (!analysisContent) {
        throw new Error("No analysis content received from OpenAI");
      }

      const analysisResponse = JSON.parse(analysisContent) as {
        results: TestResultAnalysis[];
      };
      const analysisResults = analysisResponse.results;
      logger.info(
        `Successfully analyzed ${analysisResults.length} test results`,
      );

      return analysisResults;
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        logger.error(`OpenAI API error: ${error.status} - ${error.message}`);
        throw new Error(`OpenAI API error: ${error.status} - ${error.message}`);
      }
      logger.error("Error analyzing test results:", error);
      throw error;
    }
  },
};
