import getLogger from "@/lib/logger";
import { PlaywrightTestResults } from "@/types";

const logger = getLogger("test-analysis");

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
  workerIndex: number;
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
  async analyzeTestResults(
    testResults: PlaywrightTestResults,
  ): Promise<TestResultAnalysis[]> {
    try {
      const prompt = this.buildTestAnalysisPrompt(testResults);

      const requestData: TestAnalysisRequest = {
        model: "gpt-4.1-mini",
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
                      workerIndex: {
                        type: "number",
                        description: "Worker index",
                      },
                    },
                    required: ["id", "status", "confidence"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["results"],
              additionalProperties: false,
            },
          },
        },
      };

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        },
      );

      if (!response.ok) {
        const errorData = await response.text();
        logger.error(`OpenAI API error: ${response.status} - ${errorData}`);
        console.log(errorData);
        throw new Error(
          `OpenAI API error: ${response.status} - ${response.statusText}`,
        );
      }

      const data = (await response.json()) as TestAnalysisResponse;
      const analysisContent = data.choices[0]?.message?.content;

      if (!analysisContent) {
        throw new Error("No analysis content received from OpenAI");
      }

      // With structured outputs, the response is guaranteed to be valid JSON
      const analysisResponse = JSON.parse(analysisContent) as {
        results: TestResultAnalysis[];
      };
      const analysisResults = analysisResponse.results;
      logger.info(
        `Successfully analyzed ${analysisResults.length} test results`,
      );

      return analysisResults;
    } catch (error) {
      logger.error("Error analyzing test results:", error);
      throw error;
    }
  },

  buildTestAnalysisPrompt(testResults: PlaywrightTestResults): string {
    // Recursively count test results from nested suites
    const countTestResults = (
      suites: PlaywrightTestResults["suites"],
    ): number => {
      return suites.reduce((acc, suite) => {
        // Count results from specs in this suite
        let suiteCount = suite.specs.reduce((specAcc, spec) => {
          return (
            specAcc +
            spec.tests.reduce((testAcc, test) => {
              return testAcc + test.results.length;
            }, 0)
          );
        }, 0);

        // Recursively count results from nested suites
        if (suite.suites && suite.suites.length > 0) {
          suiteCount += countTestResults(suite.suites);
        }

        return acc + suiteCount;
      }, 0);
    };

    const testResultsCount = countTestResults(testResults.suites);

    const prompt = `
        CRITICAL: You are analyzing ${testResultsCount} individual test result executions from Playwright. You MUST return exactly ${testResultsCount} analysis objects.

        For each test result execution:
        1. Use a unique identifier that you can generate from the test data
        2. Determine if the test PASSED or FAILED based on resultStatus
        3. If FAILED, categorize the failure into one of these 5 categories:
           - bug: Application defects, logic errors, incorrect behavior, assertion failures
           - infra: Infrastructure issues, environment problems, deployment issues, network issues, MFA/auth issues
           - performance: Slow response times, timeouts, resource constraints
           - script: Test script issues, automation problems, test code defects, selector issues
           - other: Everything else that doesn't fit the above categories
        4. If PASSED, do NOT include a category field

        Analysis Guidelines:
        - Look at error messages, stack traces, and failure reasons in the full JSON
        - Consider timeout errors: could be performance (slow app) or infra (network/environment)
        - Authentication/MFA errors usually indicate infra or script issues
        - Assertion failures often indicate bugs in the application
        - Selector not found errors typically indicate script issues
        - Network/connection errors usually indicate infra issues
        - Parse through nested suites > specs > tests > results structure

        You MUST return ONLY a JSON object with a results array:
        {
          "results": [
            {
              "id": "test identifier or hash",
              "workerIndex": 0,
              "status": "passed",
              "confidence": 0.95
            },
            {
              "id": "test identifier or hash", 
              "workerIndex": 1,
              "status": "failed",
              "category": "bug",
              "confidence": 0.85
            }
          ]
        }

        STRICT REQUIREMENTS:
        - Generate a unique id for each test result (combine spec title, file, worker index, retry, etc.)
        - Include workerIndex from the result data
        - Status must be exactly "passed" or "failed" (use result.status from the JSON)
        - Category ONLY for failed tests (one of: bug, infra, performance, script, other)
        - Confidence should be between 0.0 and 1.0
        - NO markdown formatting, NO explanatory text
        - Response must be valid JSON object with "results" array
        - MANDATORY: Return exactly ${testResultsCount} results

        Complete Playwright Test Results JSON (for error analysis):
        ${JSON.stringify(testResults, null, 2)}
    `;
    return prompt;
  },
};

