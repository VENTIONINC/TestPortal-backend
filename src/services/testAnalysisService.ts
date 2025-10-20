import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

import getLogger from "@/lib/logger";
import { getCtrfAnalysisPrompt } from "@/prompts/ctrf-analysis";
import { getTestAnalysisPrompt } from "@/prompts/test-analysis";
import {
  testAnalysisSchema,
  type TestResultAnalysis,
} from "@/schemas/testAnalysisSchemas";
import { PlaywrightTestResults } from "@/types";
import type { CTRFReport, CTRFTest } from "@/types/ctrf";

const logger = getLogger("test-analysis");

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
          `All ${allResults.length} tests passed, skipping LangChain analysis`,
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

      const model = new ChatOpenAI({
        model: "gpt-4.1-mini",
        temperature: 0.7,
        maxTokens: 4000,
        maxRetries: 2,
      });

      const structuredModel = model.withStructuredOutput<
        z.infer<typeof testAnalysisSchema>
      >(testAnalysisSchema, {
        name: "test_analysis",
      });

      const analysisResponse = await structuredModel.invoke([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);

      const failedAnalysisResults: TestResultAnalysis[] =
        analysisResponse.results.map((result) => {
          const mapped: TestResultAnalysis = {
            id: result.id,
            status: result.status,
            confidence: result.confidence,
            workerIndex: result.workerIndex,
            category: result.category ?? "other",
            conclusion: result.conclusion ?? "No conclusion provided",
          };

          return mapped;
        });

      const combinedResults: TestResultAnalysis[] = [
        ...failedAnalysisResults,
        ...passedResults,
      ];

      logger.info(
        `Successfully analyzed ${combinedResults.length} test results (${failedAnalysisResults.length} failed via LangChain, ${passedResults.length} passed mocked)`,
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
      const { tests } = ctrfReport.results;

      logger.info(`Analyzing ${tests.length} CTRF test results`);

      const { failedResults } = this.extractCtrfTestResults(tests);

      if (failedResults.length === 0) {
        logger.info("All CTRF tests passed, skipping LangChain analysis");
        return [];
      }

      const failedTests = tests.filter((test) => test.status !== "passed");
      const essentialData = this.extractCtrfEssentialData(failedTests);
      const systemPrompt = getTestAnalysisPrompt(essentialData.length);
      const userPrompt = JSON.stringify(essentialData);

      const model = new ChatOpenAI({
        model: "gpt-4.1-mini",
        temperature: 0.7,
        maxTokens: 4000,
        maxRetries: 2,
      });

      const structuredModel = model.withStructuredOutput<
        z.infer<typeof testAnalysisSchema>
      >(testAnalysisSchema, {
        name: "test_analysis",
      });

      const analysisResponse = await structuredModel.invoke([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);

      const failedAnalysisResults: TestResultAnalysis[] =
        analysisResponse.results;

      logger.info(
        `Successfully analyzed CTRF test results (${failedAnalysisResults.length} failed via LangChain)`,
      );

      return failedAnalysisResults;
    } catch (error) {
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

  /**
   * Analyze test results that have already been persisted to the database.
   * Uses real DB IDs instead of workerIndex for matching.
   *
   * @param results - Array of Result records with spec, execution, and errors relations
   * @returns Map of resultId → TestResultAnalysis
   */
  async analyzeStoredResults(
    results: Array<{
      id: string;
      status: string;
      duration: number;
      startTime: Date;
      retry: number;
      spec: { key: string; title: string; file: string };
      execution: { name: string; environment: string };
      errors: Array<{ message: string; callStack: string; location: string }>;
    }>,
  ): Promise<Map<string, TestResultAnalysis>> {
    try {
      logger.info(`Analyzing ${results.length} stored test results`);

      // Filter to only failed tests
      const failedResults = results.filter(
        (result) => result.status !== "passed",
      );

      logger.info(
        `Found ${failedResults.length} failed results out of ${results.length} total`,
      );
      logger.debug(
        `Failed result statuses: ${failedResults.map((r) => r.status).join(", ")}`,
      );

      if (failedResults.length === 0) {
        logger.info("All stored tests passed, skipping analysis");
        return new Map();
      }

      // Transform stored results to essential data for AI analysis
      const essentialData = failedResults.map((result) => {
        const essentialResult: {
          id: string;
          specKey: string;
          specTitle: string;
          status: string;
          duration: number;
          retry: number;
          executionName: string;
          errorMessage?: string;
          errorStack?: string;
          errorLocation?: string;
        } = {
          id: result.id,
          specKey: result.spec.key,
          specTitle: result.spec.title,
          status: result.status,
          duration: result.duration,
          retry: result.retry,
          executionName: result.execution.name,
        };

        // Add error information if present
        if (result.errors.length > 0) {
          const firstError = result.errors[0];
          if (firstError) {
            essentialResult.errorMessage = firstError.message;
            essentialResult.errorStack = firstError.callStack;
            essentialResult.errorLocation = firstError.location;
          }
        }

        return essentialResult;
      });

      const systemPrompt = getCtrfAnalysisPrompt(essentialData.length);
      const userPrompt = JSON.stringify(essentialData);

      const model = new ChatOpenAI({
        model: "gpt-4.1-mini",
        temperature: 0.7,
        maxTokens: 4000,
        maxRetries: 2,
      });

      const structuredModel = model.withStructuredOutput<
        z.infer<typeof testAnalysisSchema>
      >(testAnalysisSchema, {
        name: "test_analysis",
      });

      const analysisResponse = await structuredModel.invoke([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);

      logger.info(
        `AI returned ${analysisResponse.results.length} analysis results (expected ${failedResults.length})`,
      );

      // Convert array to Map keyed by result ID
      const analysisMap = new Map<string, TestResultAnalysis>();
      for (const result of analysisResponse.results) {
        analysisMap.set(result.id, {
          id: result.id,
          status: result.status,
          confidence: result.confidence,
          workerIndex: 0, // Not used for stored results
          category: result.category ?? "other",
          conclusion: result.conclusion ?? "No conclusion provided",
        });
      }

      logger.info(
        `Successfully analyzed ${analysisMap.size} stored test results`,
      );

      return analysisMap;
    } catch (error) {
      logger.error("Error analyzing stored test results:", error);
      throw error;
    }
  },
};
