import OpenAI from "openai";

import getLogger from "@/lib/logger";
import { PlaywrightTestResults } from "@/types";

const client = new OpenAI();

const logger = getLogger("test-analysis");

export interface TestResultAnalysis {
  id: string;
  status: "passed" | "failed";
  category?: "bug" | "infra" | "performance" | "script" | "other";
  confidence: number;
  workerIndex: number;
}

export const testAnalysisService = {
  async analyzeTestResults(
    testResults: PlaywrightTestResults,
  ): Promise<TestResultAnalysis[]> {
    try {
      const { passedResults, failedResults, allResults } =
        this.extractTestResults(testResults);

      if (failedResults.length === 0) {
        logger.info(
          `All ${allResults.length} tests passed, skipping OpenAI analysis`,
        );

        return passedResults;
      }

      // If there are failures, analyze only failed tests
      const failedTestResults = this.createFilteredTestResults(
        testResults,
        failedResults,
      );
      const prompt = this.buildTestAnalysisPrompt(
        failedTestResults,
        failedResults.length,
      );

      const completion = await client.chat.completions.create({
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
      });

      const analysisContent = completion.choices[0]?.message?.content;

      if (!analysisContent) {
        throw new Error("No analysis content received from OpenAI");
      }

      // Parse OpenAI response for failed tests
      const analysisResponse = JSON.parse(analysisContent) as {
        results: TestResultAnalysis[];
      };
      const failedAnalysisResults = analysisResponse.results;

      const combinedResults = [...failedAnalysisResults, ...passedResults];

      logger.info(
        `Successfully analyzed ${combinedResults.length} test results (${failedAnalysisResults.length} failed via OpenAI, ${passedResults.length} passed mocked)`,
      );

      return combinedResults;
    } catch (error) {
      logger.error("Error analyzing test results:", error);
      throw error;
    }
  },

  extractTestResults(testResults: PlaywrightTestResults): {
    passedResults: TestResultAnalysis[];
    failedResults: TestResultAnalysis[];
    allResults: TestResultAnalysis[];
  } {
    const allResults: TestResultAnalysis[] = [];

    const processResults = (suites: PlaywrightTestResults["suites"]) => {
      suites.forEach((suite) => {
        suite.specs.forEach((spec) => {
          spec.tests.forEach((test, testIndex) => {
            test.results.forEach((result, resultIndex) => {
              const id = `${spec.file}_${spec.title}_${testIndex}_${result.workerIndex}_${resultIndex}`;
              allResults.push({
                id,
                workerIndex: result.workerIndex,
                status: result.status,
                confidence: 1,
              });
            });
          });
        });

        // Process nested suites recursively
        if (suite.suites && suite.suites.length > 0) {
          processResults(suite.suites);
        }
      });
    };

    processResults(testResults.suites);

    const passedResults = allResults.filter(
      (result) => result.status === "passed",
    );
    const failedResults = allResults.filter(
      (result) => result.status !== "passed",
    );

    return { passedResults, failedResults, allResults };
  },

  createFilteredTestResults(
    originalResults: PlaywrightTestResults,
    failedResults: TestResultAnalysis[],
  ): PlaywrightTestResults {
    const failedIds = new Set(failedResults.map((r) => r.id));

    const filterSuites = (
      suites: PlaywrightTestResults["suites"],
    ): PlaywrightTestResults["suites"] => {
      return suites
        .map((suite) => {
          const filteredSpecs = suite.specs
            .map((spec) => {
              const filteredTests = spec.tests
                .map((test, testIndex) => {
                  const filteredTestResults = test.results.filter(
                    (result, resultIndex) => {
                      const id = `${spec.file}_${spec.title}_${testIndex}_${result.workerIndex}_${resultIndex}`;

                      return failedIds.has(id);
                    },
                  );

                  return { ...test, results: filteredTestResults };
                })
                .filter((test) => test.results.length > 0);

              return { ...spec, tests: filteredTests };
            })
            .filter((spec) => spec.tests.length > 0);

          const filteredNestedSuites = suite.suites
            ? filterSuites(suite.suites)
            : [];

          return {
            ...suite,
            specs: filteredSpecs,
            suites: filteredNestedSuites,
          };
        })
        .filter(
          (suite) =>
            suite.specs.length > 0 || (suite.suites && suite.suites.length > 0),
        );
    };

    return {
      ...originalResults,
      suites: filterSuites(originalResults.suites),
    };
  },

  buildTestAnalysisPrompt(
    testResults: PlaywrightTestResults,
    resultsCount: number,
  ): string {
    const prompt = `
        CRITICAL: You are analyzing ${resultsCount} individual test result executions from Playwright. You MUST return exactly ${resultsCount} analysis objects.

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
        - MANDATORY: Return exactly ${resultsCount} results

        Complete Playwright Test Results JSON (for error analysis):
        ${JSON.stringify(testResults, null, 2)}
    `;
    return prompt;
  },
};

