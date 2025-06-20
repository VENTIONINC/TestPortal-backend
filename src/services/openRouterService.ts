import getLogger from "@/lib/logger";
import * as fs from "fs";
import * as path from "path";

const logger = getLogger("openrouter");

export interface OpenRouterResponse {
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
}

export interface OpenRouterRequest {
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

export const openRouterService = {
  async analyzeTestResults(testResults?: any[]): Promise<TestResultAnalysis[]> {
    try {
      // If no test results provided, read from local files
      const resultsToAnalyze =
        testResults ?? (await this.readLocalTestResults());

      const prompt = this.buildTestAnalysisPrompt(resultsToAnalyze);

      const requestData: OpenRouterRequest = {
        model: "deepseek/deepseek-chat-v3-0324:free",
        messages: [
          {
            role: "system",
            content: `You are an expert test automation analyst. Analyze test results and categorize failures systematically into one of these categories: bug, infra, performance, script, other.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "test_analysis",
            strict: true,
            schema: {
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
                    enum: ["bug", "infra", "performance", "script", "other"],
                    description: "Failure category (only for failed tests)",
                  },
                  confidence: {
                    type: "number",
                    minimum: 0.0,
                    maximum: 1.0,
                    description: "Confidence level of the analysis",
                  },
                },
                required: ["id", "status", "confidence"],
                additionalProperties: false,
              },
            },
          },
        },
      };

      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "HTTP-Referer": process.env.SITE_URL ?? "http://localhost",
            "X-Title": process.env.SITE_NAME ?? "Test Portal Backend",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        },
      );

      if (!response.ok) {
        const errorData = await response.text();
        logger.error(`OpenRouter API error: ${response.status} - ${errorData}`);
        throw new Error(
          `OpenRouter API error: ${response.status} - ${response.statusText}`,
        );
      }

      const data = (await response.json()) as OpenRouterResponse;
      const analysisContent = data.choices[0]?.message?.content;

      if (!analysisContent) {
        throw new Error("No analysis content received from OpenRouter");
      }

      // With structured outputs, the response is guaranteed to be valid JSON
      const analysisResults = JSON.parse(
        analysisContent,
      ) as TestResultAnalysis[];
      logger.info(
        `Successfully analyzed ${analysisResults.length} test results`,
      );

      return analysisResults;
    } catch (error) {
      logger.error("Error analyzing test results:", error);
      throw error;
    }
  },

  async readLocalTestResults(): Promise<any[]> {
    try {
      const testResultsDir = path.join(
        process.cwd(),
        "prisma",
        "seed",
        "json-examples",
      );

      if (!fs.existsSync(testResultsDir)) {
        logger.warn(`Test results directory not found: ${testResultsDir}`);
        return [];
      }

      const files = fs
        .readdirSync(testResultsDir)
        .filter((file) => file.endsWith(".json"));

      if (files.length === 0) {
        logger.warn(`No JSON files found in: ${testResultsDir}`);
        return [];
      }

      const testResults: any[] = [];

      for (const file of files) {
        try {
          const filePath = path.join(testResultsDir, file);
          const fileContent = fs.readFileSync(filePath, "utf-8");
          const testResult = JSON.parse(fileContent);

          // Add filename for reference
          testResult.sourceFile = file;
          testResults.push(testResult);

          logger.info(`Loaded test result from: ${file}`);
        } catch (fileError) {
          logger.error(`Error reading file ${file}:`, fileError);
        }
      }

      logger.info(
        `Successfully loaded ${testResults.length} test result files`,
      );
      return testResults;
    } catch (error) {
      logger.error("Error reading local test results:", error);
      throw error;
    }
  },

  buildTestAnalysisPrompt(testResults: any[]): string {
    const prompt = `
        CRITICAL: You are analyzing ${testResults.length} test results. You MUST return exactly ${testResults.length} analysis objects in the JSON array.

        For each test result:
        1. Determine if the test PASSED or FAILED
        2. If FAILED, categorize the failure into one of these 5 categories:
           - bug: Application defects, logic errors, incorrect behavior
           - infra: Infrastructure issues, environment problems, deployment issues  
           - performance: Slow response times, timeouts, resource constraints
           - script: Test script issues, automation problems, test code defects
           - other: Everything else that doesn't fit the above categories
        3. If PASSED, do NOT include a category field

        You MUST return ONLY a raw JSON array:
        [
          {
            "id": "test identifier or hash",
            "status": "passed",
            "confidence": 0.95
          },
          {
            "id": "test identifier or hash", 
            "status": "failed",
            "category": "bug",
            "confidence": 0.85
          }
        ]

        STRICT REQUIREMENTS:
        - Extract test ID from customReport.testNameHash, customReport.testName, or create from available identifiers
        - Status must be exactly "passed" or "failed"
        - Category ONLY for failed tests (one of: bug, infra, performance, script, other)
        - Confidence should be between 0.0 and 1.0
        - NO markdown formatting, NO explanatory text
        - Response must be valid JSON starting with [ and ending with ]

        MANDATORY: Your response must contain exactly ${testResults.length} objects - one for each test result provided.

        Test Results to Analyze (${testResults.length} total):
        ${JSON.stringify(testResults, null, 2)}
    `;
    return prompt;
  },
};

