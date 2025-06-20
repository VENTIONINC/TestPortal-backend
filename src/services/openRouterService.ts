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
  category: "bug" | "infra" | "performance" | "script" | "other";
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
        temperature: 0.3,
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
                  category: {
                    type: "string",
                    enum: ["bug", "infra", "performance", "script", "other"],
                    description: "Failure category",
                  },
                  confidence: {
                    type: "number",
                    minimum: 0.0,
                    maximum: 1.0,
                    description: "Confidence level of the categorization",
                  },
                },
                required: ["id", "category", "confidence"],
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
      const analysisResults = JSON.parse(analysisContent) as TestResultAnalysis[];
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
        Analyze the following test results and categorize each failure into one of these 5 categories only:

        CATEGORIES:
        - bug: Application defects, logic errors, incorrect behavior
        - infra: Infrastructure issues, environment problems, deployment issues  
        - performance: Slow response times, timeouts, resource constraints
        - script: Test script issues, automation problems, test code defects
        - other: Everything else that doesn't fit the above categories

        You MUST return ONLY a raw JSON array starting with [ and ending with ]:
        [
        {
            "id": "test identifier or hash",
            "category": "bug",
            "confidence": 0.85
        }
        ]

        STRICT REQUIREMENTS:
        - NO markdown formatting (no \`\`\`json blocks)
        - NO explanatory text before or after the JSON
        - Extract test ID from customReport.testNameHash, customReport.testName, or create from available identifiers
        - Category must be exactly one of: bug, infra, performance, script, other
        - Confidence should be between 0.0 and 1.0
        - Response must be valid JSON that starts with [ and ends with ]

        Test Results to Analyze:
        ${JSON.stringify(testResults, null, 2)}
        `;
    return prompt;
  },
};

