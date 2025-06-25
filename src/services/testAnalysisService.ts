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

      // Log token optimization info
      const originalSize = JSON.stringify(testResults).length;
      const optimizedSize = JSON.stringify(
        this.extractEssentialTestData(failedTestResults),
      ).length;
      const reduction = (
        ((originalSize - optimizedSize) / originalSize) *
        100
      ).toFixed(1);
      logger.info(
        `Token optimization: ${originalSize} → ${optimizedSize} chars (${reduction}% reduction)`,
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
    // Extract only essential data for analysis to reduce token usage
    const essentialData = this.extractEssentialTestData(testResults);

    const prompt = `Analyze ${resultsCount} Playwright test results. Return exactly ${resultsCount} analysis objects.

      Categories for FAILED tests only:
      - bug: App defects, logic errors, assertion failures
      - infra: Environment, network, deployment, MFA/auth issues  
      - performance: Timeouts, slow responses, resource constraints
      - script: Test automation issues, selector problems
      - other: Everything else

      Guidelines:
      - Timeouts: performance (slow app) or infra (network)
      - Auth/MFA errors: infra or script
      - Assertion failures: bug
      - Selector not found: script
      - Network errors: infra

      Return JSON only:
      {"results":[{"id":"unique_id","workerIndex":0,"status":"passed|failed","category":"bug|infra|performance|script|other","confidence":0.0-1.0}]}

      Requirements:
      - Use provided id, workerIndex, status
      - Category only for failed tests
      - Confidence 0.0-1.0
      - Exactly ${resultsCount} results

      Data:
      ${JSON.stringify(essentialData, null, 2)}`;

    return prompt;
  },

  extractEssentialTestData(testResults: PlaywrightTestResults) {
    type EssentialResult = {
      id: string;
      specTitle: string;
      status: string;
      duration: number;
      workerIndex: number;
      retry: number;
      errorMessage?: string;
      errorStack?: string;
      errorLocation?: string;
    };

    const essentialResults: EssentialResult[] = [];

    const processResults = (suites: PlaywrightTestResults["suites"]) => {
      suites.forEach((suite) => {
        suite.specs.forEach((spec) => {
          spec.tests.forEach((test, testIndex) => {
            test.results.forEach((result, resultIndex) => {
              const id = `${spec.file}_${spec.title}_${testIndex}_${result.workerIndex}_${resultIndex}`;

              // Extract only essential fields for analysis
              const essentialResult: EssentialResult = {
                id,
                specTitle: spec.title,
                status: result.status,
                duration: result.duration,
                workerIndex: result.workerIndex,
                retry: result.retry,
              };

              // Add error information only if present (for failed tests)
              if (result.error) {
                essentialResult.errorMessage = result.error.message;
                essentialResult.errorStack = result.error.stack;
                if (result.error.location) {
                  essentialResult.errorLocation = `${result.error.location.file}:${result.error.location.line}:${result.error.location.column}`;
                }
              }

              // If no main error but has errors array, take the first one
              if (!result.error && result.errors && result.errors.length > 0) {
                const firstError = result.errors[0];
                if (firstError) {
                  essentialResult.errorMessage = firstError.message;
                  if (firstError.location) {
                    essentialResult.errorLocation = `${firstError.location.file}:${firstError.location.line}:${firstError.location.column}`;
                  }
                }
              }

              essentialResults.push(essentialResult);
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

    return essentialResults;
  },
};

