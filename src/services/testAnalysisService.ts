import OpenAI from "openai";

import getLogger from "@/lib/logger";
import { getTestAnalysisPrompt } from "@/prompts/test-analysis";
import { PlaywrightTestResults } from "@/types";
import type { CTRFReport, CTRFTest } from "@/types/ctrf";

const client = new OpenAI();

const logger = getLogger("test-analysis");

export interface TestResultAnalysis {
  id: string;
  status: "passed" | "failed";
  category?: "bug" | "infra" | "performance" | "script" | "other";
  confidence: number;

  workerIndex: number;
  conclusion?: string;
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
      const { passedResults, failedResults, allResults } =
        this.extractTestResults(testResults);

      if (failedResults.length === 0) {
        logger.info(
          `All ${allResults.length} tests passed, skipping OpenAI analysis`,
        );

        return passedResults;
      }

      const failedTestResults = this.createFilteredTestResults(
        testResults,
        failedResults,
      );

      const essentialData = this.extractEssentialTestData(failedTestResults);
      const systemPrompt = getTestAnalysisPrompt(essentialData.length);
      const userPrompt = JSON.stringify(essentialData);

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
                      workerIndex: {
                        type: "number",
                        description: "Worker index",
                      },
                      conclusion: {
                        type: "string",
                        description:
                          "Brief explanation (2-3 sentences max) for the categorization decision, only for failed tests",
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
      if (error instanceof OpenAI.APIError) {
        logger.error(`OpenAI API error: ${error.status} - ${error.message}`);
        throw new Error(`OpenAI API error: ${error.status} - ${error.message}`);
      }
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

  async analyzeCtrfTestResults(
    ctrfReport: CTRFReport,
  ): Promise<TestResultAnalysis[]> {
    try {
      const { results } = ctrfReport;
      const { tests } = results;

      logger.info(`Analyzing ${tests.length} CTRF test results`);

      const { passedResults, failedResults, allResults } =
        this.extractCtrfTestResults(tests);

      if (failedResults.length === 0) {
        logger.info(
          `All ${allResults.length} CTRF tests passed, skipping OpenAI analysis`,
        );
        return passedResults;
      }

      const failedTests = tests.filter((test) => test.status !== "passed");
      const essentialData = this.extractCtrfEssentialData(failedTests);
      const systemPrompt = getTestAnalysisPrompt(essentialData.length);
      const userPrompt = JSON.stringify(essentialData);

      // Log token optimization info
      const originalSize = JSON.stringify(tests).length;
      const optimizedSize = JSON.stringify(essentialData).length;
      const reduction = (
        ((originalSize - optimizedSize) / originalSize) *
        100
      ).toFixed(1);
      logger.info(
        `CTRF Token optimization: ${originalSize} → ${optimizedSize} chars (${reduction}% reduction)`,
      );

      const completion = await client.chat.completions.create({
        model: "gpt-5-mini",
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
                        description: "Test identifier from CTRF test name",
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
                        description: "Worker index (0 for CTRF)",
                      },
                      conclusion: {
                        type: "string",
                        description:
                          "Brief explanation (2-3 sentences max) for the categorization decision, only for failed tests",
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
        `Successfully analyzed ${combinedResults.length} CTRF test results (${failedAnalysisResults.length} failed via OpenAI, ${passedResults.length} passed mocked)`,
      );

      return combinedResults;
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        logger.error(`OpenAI API error: ${error.status} - ${error.message}`);
        throw new Error(`OpenAI API error: ${error.status} - ${error.message}`);
      }
      logger.error("Error analyzing CTRF test results:", error);
      throw error;
    }
  },

  extractCtrfTestResults(tests: CTRFTest[]): {
    passedResults: TestResultAnalysis[];
    failedResults: TestResultAnalysis[];
    allResults: TestResultAnalysis[];
  } {
    const allResults: TestResultAnalysis[] = tests.map((test, index) => {
      const id = test.meta?.testNameHash ?? test.name ?? `ctrf-test-${index}`;
      return {
        id: String(id),
        workerIndex: 0, // CTRF doesn't have worker concept, use 0
        status: test.status === "passed" ? "passed" : "failed",
        confidence: 1,
      };
    });

    const passedResults = allResults.filter(
      (result) => result.status === "passed",
    );
    const failedResults = allResults.filter(
      (result) => result.status !== "passed",
    );

    return { passedResults, failedResults, allResults };
  },

  extractCtrfEssentialData(tests: CTRFTest[]) {
    type EssentialCtrfResult = {
      id: string;
      name: string;
      status: string;
      duration: number;
      workerIndex: number;
      retry?: number;
      errorMessage?: string;
      errorTrace?: string;
      suite?: string;
      filePath?: string;
    };

    const essentialResults: EssentialCtrfResult[] = tests.map((test, index) => {
      const id = test.meta?.testNameHash ?? test.name ?? `ctrf-test-${index}`;

      const essentialResult: EssentialCtrfResult = {
        id: String(id),
        name: test.name,
        status: test.status,
        duration: test.duration,
        workerIndex: 0, // CTRF doesn't have worker concept
        retry: test.retry ?? 0,
      };

      // Add error information if present (for failed tests)
      if (test.message) {
        essentialResult.errorMessage = test.message;
      }

      if (test.trace) {
        essentialResult.errorTrace = test.trace;
      }

      if (test.suite) {
        essentialResult.suite = test.suite;
      }

      if (test.filePath) {
        essentialResult.filePath = test.filePath;
      }

      return essentialResult;
    });

    return essentialResults;
  },
};
