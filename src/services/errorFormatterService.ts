// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

import getLogger from "@/lib/logger";
import { getErrorFormatterPrompt } from "@/prompts/error-formatter/v1.0.0";
import {
  systemPrompt as errorSolutionSystemPrompt,
  userPrompt as errorSolutionUserPrompt,
} from "@/prompts/error-solution/v1.0.0";
import {
  errorFormatterSchema,
  type ErrorFormatterInput,
  type ErrorFormatterOutput,
} from "@/schemas/errorFormatterSchemas";
import { errorSuggestionSchema } from "@/schemas/errorSuggestionSchemas";
import { resultService } from "@/services/resultService";
import { testAnalysisService } from "@/services/testAnalysisService";
import type { ResultWithRelations } from "@/types";

const logger = getLogger("error-formatter");

export const errorFormatterService = {
  async formatErrorMessage(
    input: ErrorFormatterInput,
  ): Promise<ErrorFormatterOutput> {
    try {
      logger.info("Formatting error message with LangChain");

      const model = new ChatOpenAI({
        model: "gpt-4.1-mini",
        temperature: 0.7,
        maxTokens: 500,
        maxRetries: 2,
      });

      const structuredModel = model.withStructuredOutput<
        z.infer<typeof errorFormatterSchema>
      >(errorFormatterSchema, {
        name: "error_formatter_response",
      });

      const userContent = `Name: ${input.name}
Description: ${input.description}
Category: ${input.category}`;

      const result = await structuredModel.invoke([
        { role: "system", content: getErrorFormatterPrompt() },
        { role: "user", content: userContent },
      ]);

      logger.info("Successfully formatted error message");
      return result;
    } catch (error) {
      logger.error("Error formatting message:", error);
      throw new Error("Failed to format error message");
    }
  },

  async suggestFromResult(
    resultId: string,
    projectId: string,
  ): Promise<{ category: string; description: string }> {
    try {
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

      const analysis = await resolveResultAnalysis(result);

      const model = new ChatOpenAI({
        model: "gpt-4.1-mini",
        temperature: 0.3,
        maxTokens: 700,
        maxRetries: 2,
      });

      const structuredModel = model.withStructuredOutput<
        z.infer<typeof errorSuggestionSchema>
      >(errorSuggestionSchema, {
        name: "error_solution_suggestion",
      });

      const prompt = ChatPromptTemplate.fromMessages([
        ["system", errorSolutionSystemPrompt],
        ["human", errorSolutionUserPrompt],
      ]);

      const suggestion = await structuredModel.invoke(
        await prompt.formatMessages({
          errorMessage: primaryError.message,
          errorStack: normalizeErrorStack(primaryError.callStack) ?? "(none)",
          errorLocation: primaryError.location ?? "(none)",
          analysisCategory: analysis.category,
        }),
      );

      return {
        category: analysis.category,
        description: suggestion.description,
      };
    } catch (error) {
      logger.error("Error generating solution suggestion:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to generate error suggestion",
      );
    }
  },
};

const resolveResultAnalysis = async (
  result: ResultWithRelations,
): Promise<{
  category: string;
  confidence?: number | null;
  conclusion?: string | null;
  errorQuality?: number | null;
  errorQualityConclusion?: string | null;
}> => {
  if (result.analysisCategory) {
    return {
      category: result.analysisCategory,
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
    return {
      category: "other",
    };
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

  if (typeof callStack === "string") {
    try {
      const parsed = JSON.parse(callStack);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return callStack;
    }
  }

  return JSON.stringify(callStack, null, 2);
};
