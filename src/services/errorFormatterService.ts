// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { ChatPromptTemplate } from "@langchain/core/prompts";
import type { RunnableConfig } from "@langchain/core/runnables";

import { normalizeJsonArrayForText } from "@/lib/jsonPayloads";
import {
  createGenerativeAiClient,
  GenerativeAiError,
  parseStructuredCompletion,
} from "@/lib/generativeAi";
import getLogger from "@/lib/logger";
import { getEffectiveResultCategory } from "@/lib/resultCategory";
import { getErrorFormatterPrompt } from "@/prompts/error-formatter/v1.1.0";
import {
  systemPrompt as errorSolutionSystemPrompt,
  userPrompt as errorSolutionUserPrompt,
} from "@/prompts/error-solution/v1.0.0";
import {
  errorFormatterSchema,
  type ErrorFormatterInput,
  type ErrorFormatterOutput,
} from "@/schemas/errorFormatterSchemas";
import {
  errorSuggestionSchema,
  type ErrorSuggestionOutput,
} from "@/schemas/errorSuggestionSchemas";
import { resultService } from "@/services/resultService";
import { testAnalysisService } from "@/services/testAnalysisService";
import type { StructuredResultWithRelations } from "@/types";

const logger = getLogger("error-formatter");

export const errorFormatterService = {
  async formatErrorMessage(
    input: ErrorFormatterInput,
    clientOverride?: ReturnType<typeof createGenerativeAiClient>,
    runOptions?: RunnableConfig,
  ): Promise<ErrorFormatterOutput> {
    try {
      logger.info("Formatting error message with LangChain");

      const client = clientOverride ?? createGenerativeAiClient("formatting");

      const structuredModel = client.model.withStructuredOutput<ErrorFormatterOutput>(
        errorFormatterSchema,
        {
        name: "error_formatter_response",
        includeRaw: true,
        },
      );

      const userContent = [
        `Name: ${input.name}`,
        `Description: ${input.description}`,
        ...(input.contextCategory
          ? [`Context category: ${input.contextCategory}`]
          : []),
      ].join("\n");

      const result: unknown = await client.invoke(() =>
        runOptions
          ? structuredModel.invoke(
              [
                { role: "system", content: getErrorFormatterPrompt() },
                { role: "user", content: userContent },
              ],
              runOptions,
            )
          : structuredModel.invoke([
              { role: "system", content: getErrorFormatterPrompt() },
              { role: "user", content: userContent },
            ]),
      );

      const parsed = parseStructuredCompletion(
        client,
        result,
        errorFormatterSchema,
      );

      logger.info("Successfully formatted error message");
      return parsed;
    } catch (error) {
      if (error instanceof GenerativeAiError) {
        logger.error("Error formatting message:", error.diagnostic);
      } else {
        logger.error("Error formatting message");
      }
      throw new Error("Failed to format error message");
    }
  },

  async suggestFromResult(
    resultId: string,
    projectId: string,
  ): Promise<ErrorSuggestionOutput> {
    if (!resultId) {
      throw new Error("Result ID is required");
    }

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const result = await resultService.getResultById(resultId, projectId);

    if (result.status !== "failed" && result.status !== "flaky") {
      throw new Error("Only failed or flaky results can be analyzed");
    }

    const primaryError = result.errors?.[0];
    if (!primaryError) {
      throw new Error("Result has no error details to analyze");
    }

    try {
      const analysis = await resolveResultAnalysis(result);

      const client = createGenerativeAiClient("suggestions");

      const structuredModel = client.model.withStructuredOutput<ErrorSuggestionOutput>(
        errorSuggestionSchema,
        {
          name: "error_solution_suggestion",
          includeRaw: true,
        },
      );

      const prompt = ChatPromptTemplate.fromMessages([
        ["system", errorSolutionSystemPrompt],
        ["human", errorSolutionUserPrompt],
      ]);

      const messages = await prompt.formatMessages({
        errorMessage: primaryError.message,
        errorStack: normalizeErrorStack(primaryError.callStack) ?? "(none)",
        errorLocation: primaryError.location ?? "(none)",
        analysisCategory: analysis.category ?? "uncategorized",
      });
      const suggestionResult: unknown = await client.invoke(() =>
        structuredModel.invoke(messages),
      );
      const suggestion = parseStructuredCompletion(
        client,
        suggestionResult,
        errorSuggestionSchema,
      );

      return {
        category: suggestion.category,
        name: suggestion.name,
        description: suggestion.description,
      };
    } catch (error) {
      if (error instanceof GenerativeAiError) {
        logger.error("Error generating solution suggestion:", error.diagnostic);
      } else {
        logger.error("Error generating solution suggestion");
      }
      throw new Error("Failed to generate error suggestion");
    }
  },
};

const resolveResultAnalysis = async (
  result: StructuredResultWithRelations,
): Promise<{
  category: ReturnType<typeof getEffectiveResultCategory>;
  confidence?: number | null;
  conclusion?: string | null;
  errorQuality?: number | null;
  errorQualityConclusion?: string | null;
}> => {
  const hasAuthoritativeFeedback =
    result.analysisFeedbackCategory !== null &&
    result.analysisFeedbackCategory !== undefined;
  const effectiveCategory = getEffectiveResultCategory(result);

  if (hasAuthoritativeFeedback || effectiveCategory) {
    return {
      category: effectiveCategory,
      confidence: result.analysisConfidence ?? null,
      conclusion: result.analysisConclusion ?? null,
      errorQuality: result.analysisErrorQuality ?? null,
      errorQualityConclusion: result.analysisErrorQualityConclusion ?? null,
    };
  }

  const analysisMap = await testAnalysisService.analyzeStoredResults([
    {
      id: result.id,
      status: result.status,
      duration: result.duration,
      startTime: result.startTime,
      retry: result.retry,
      spec: {
        key: result.spec.key,
        title: result.spec.title,
        file: result.spec.file,
      },
      execution: {
        name: result.execution.name,
        environment: result.execution.environment,
      },
      errors: result.errors.map((error) => ({
        message: error.message,
        callStack: normalizeErrorStack(error.callStack) ?? "",
        location: error.location,
      })),
    },
  ]);

  const analysis = analysisMap.get(result.id);
  if (!analysis) {
    throw new Error("Stored result classification was unavailable");
  }

  return {
    category: analysis.category,
    confidence: analysis.confidence,
    conclusion: analysis.conclusion,
    errorQuality: analysis.errorQuality,
    errorQualityConclusion: analysis.errorQualityConclusion,
  };
};

const normalizeErrorStack = (callStack: unknown): string | null => {
  if (!callStack) {
    return null;
  }

  return normalizeJsonArrayForText(callStack);
};
