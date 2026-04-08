import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

import { assumptionModel } from "@/models/assumptionModel";
import { executionModel } from "@/models/executionModel";
import { issueModel } from "@/models/issueModel";
import { resultErrorModel } from "@/models/resultErrorModel";
import { dbClient } from "@/prisma/client";
import { getFailureGroupingPrompt } from "@/prompts/failure-grouping/v1.0.0";
import {
  failureGroupingResponseSchema,
  type FailureGroupingPromptGroup,
} from "@/schemas/failureGroupingSchemas";
import { assumptionService } from "@/services/assumptionService";
import {
  calculateErrorSimilarity,
  compareStackTraces,
} from "@/lib/error-analyzer";
import getLogger from "@/lib/logger";
import type {
  AcceptFailureGroupResponse,
  FailureGroup,
  FailureGroupingCategory,
  FailureGroupingReason,
  GroupFailuresResponse,
  PrismaResultError,
} from "@/types";

const logger = getLogger("failure-grouping-service");

const MAX_FAILURE_GROUPING_ITEMS = 25;
const FAILURE_GROUPING_TIMEOUT_MS = 8_000;
const SIMILARITY_THRESHOLD = 0.7;
const SINGLETON_CONFIDENCE = 0.6;

type ExecutionGroupingResultError = PrismaResultError & {
  result: {
    id: string;
    status: string;
    retry: number;
    analysisCategory: string | null;
    analysisConclusion: string | null;
    executionId: string;
  } | null;
};

interface GroupCluster {
  members: ExecutionGroupingResultError[];
}

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> => {
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("FAILURE_GROUPING_TIMEOUT"));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const parseStringArray = (value?: string | null): string[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : value
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
  } catch {
    return value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
};

const roundConfidence = (value: number): number => {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
};

const buildSuggestedIssueQuery = (text: string): string | undefined => {
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);

  const stopWords = new Set([
    "that",
    "with",
    "from",
    "this",
    "have",
    "when",
    "into",
    "during",
    "likely",
    "tests",
    "test",
    "across",
    "same",
    "cause",
    "error",
    "errors",
    "failed",
    "failure",
  ]);

  const keywords = normalized.filter((token) => !stopWords.has(token));
  if (keywords.length === 0) {
    return undefined;
  }

  return keywords.slice(0, 3).join(" ");
};

const calculatePairwiseSimilarity = (
  left: ExecutionGroupingResultError,
  right: ExecutionGroupingResultError,
): number => {
  const errorSimilarity = calculateErrorSimilarity(left.message, right.message);
  const leftCallLog = parseStringArray(left.callLog);
  const rightCallLog = parseStringArray(right.callLog);
  const leftCallStack = parseStringArray(left.callStack);
  const rightCallStack = parseStringArray(right.callStack);

  const callLogSimilarity = compareStackTraces(leftCallLog, rightCallLog);
  const callStackSimilarity = compareStackTraces(leftCallStack, rightCallStack);

  return (
    errorSimilarity * 0.4 + callLogSimilarity * 0.3 + callStackSimilarity * 0.3
  );
};

const calculateClusterConfidence = (
  members: ExecutionGroupingResultError[],
): number => {
  if (members.length <= 1) {
    return SINGLETON_CONFIDENCE;
  }

  const scores: number[] = [];
  for (let firstIndex = 0; firstIndex < members.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < members.length;
      secondIndex += 1
    ) {
      const left = members[firstIndex];
      const right = members[secondIndex];
      if (left && right) {
        scores.push(calculatePairwiseSimilarity(left, right));
      }
    }
  }

  if (scores.length === 0) {
    return SINGLETON_CONFIDENCE;
  }

  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return roundConfidence(average);
};

const buildAlgorithmicDescription = (
  members: ExecutionGroupingResultError[],
): string => {
  const baseDescription = members[0]?.result?.analysisConclusion?.trim();
  if (!baseDescription) {
    return members.length === 1
      ? "Single failure without a refined semantic summary."
      : `Potentially related failures grouped by textual similarity (${members.length} failures).`;
  }

  return members.length === 1
    ? baseDescription
    : `${baseDescription} (${members.length} failures).`;
};

const normalizeAlgorithmicGroups = (
  clusters: GroupCluster[],
): FailureGroup[] => {
  return clusters.map(({ members }) => {
    const groupDescription = buildAlgorithmicDescription(members);
    const suggestedIssueQuery = buildSuggestedIssueQuery(groupDescription);

    return {
      groupDescription,
      confidence: calculateClusterConfidence(members),
      resultErrorIds: members.map(({ id }) => id),
      ...(suggestedIssueQuery ? { suggestedIssueQuery } : {}),
    };
  });
};

const buildAlgorithmicClusters = (
  resultErrors: ExecutionGroupingResultError[],
): FailureGroup[] => {
  const clusters: GroupCluster[] = [];

  for (const resultError of resultErrors) {
    let bestCluster: GroupCluster | undefined;
    let bestScore = 0;

    for (const cluster of clusters) {
      const score = Math.max(
        ...cluster.members.map((member) =>
          calculatePairwiseSimilarity(member, resultError),
        ),
      );

      if (score > bestScore) {
        bestScore = score;
        bestCluster = cluster;
      }
    }

    if (bestCluster && bestScore >= SIMILARITY_THRESHOLD) {
      bestCluster.members.push(resultError);
    } else {
      clusters.push({ members: [resultError] });
    }
  }

  return normalizeAlgorithmicGroups(clusters);
};

const validatePromptGroups = (
  promptGroups: FailureGroupingPromptGroup[],
  resultErrors: ExecutionGroupingResultError[],
): FailureGroup[] => {
  const expectedIds = new Set(resultErrors.map(({ id }) => id));
  const seenIds = new Set<string>();

  for (const group of promptGroups) {
    for (const resultErrorId of group.resultErrorIds) {
      if (!expectedIds.has(resultErrorId)) {
        throw new Error(
          `Unknown result error ID returned by model: ${resultErrorId}`,
        );
      }

      if (seenIds.has(resultErrorId)) {
        throw new Error(
          `Duplicate result error ID returned by model: ${resultErrorId}`,
        );
      }

      seenIds.add(resultErrorId);
    }
  }

  if (seenIds.size !== expectedIds.size) {
    throw new Error("Model response does not cover all result errors");
  }

  return promptGroups.map((group) => ({
    groupDescription: group.groupDescription,
    confidence: roundConfidence(group.confidence),
    resultErrorIds: group.resultErrorIds,
    ...(group.suggestedIssueQuery
      ? { suggestedIssueQuery: group.suggestedIssueQuery }
      : {}),
  }));
};

const loadExecutionResultErrors = async (
  executionId: string,
  projectId: string,
  category: FailureGroupingCategory,
): Promise<ExecutionGroupingResultError[]> => {
  const execution = await executionModel.findById(
    executionId,
    projectId,
    dbClient,
  );
  if (!execution) {
    throw new Error(`Execution with ID ${executionId} not found`);
  }

  return await resultErrorModel.findManyForExecutionContext(
    executionId,
    projectId,
    {
      category,
    },
  );
};

const getGuardReason = (
  resultErrors: ExecutionGroupingResultError[],
): FailureGroupingReason | undefined => {
  if (resultErrors.length < 2) {
    return "insufficient_failures";
  }

  if (resultErrors.length > MAX_FAILURE_GROUPING_ITEMS) {
    return "too_many_failures";
  }

  if (
    resultErrors.some(
      (resultError) => !resultError.result?.analysisConclusion?.trim(),
    )
  ) {
    return "analysis_not_complete";
  }

  return undefined;
};

export const failureGroupingService = {
  async groupFailures(
    executionId: string,
    projectId: string,
    category: FailureGroupingCategory,
  ): Promise<GroupFailuresResponse> {
    if (!executionId) {
      throw new Error("Execution ID is required");
    }

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const resultErrors = await loadExecutionResultErrors(
      executionId,
      projectId,
      category,
    );
    const guardReason = getGuardReason(resultErrors);

    if (guardReason) {
      return {
        groups: [],
        source: "none",
        reason: guardReason,
      };
    }

    const algorithmicGroups = buildAlgorithmicClusters(resultErrors);

    try {
      const model = new ChatOpenAI({
        model: "gpt-4.1-mini",
        temperature: 0,
        maxTokens: 1200,
        maxRetries: 2,
      });

      const structuredModel = model.withStructuredOutput<
        z.infer<typeof failureGroupingResponseSchema>
      >(failureGroupingResponseSchema, {
        name: "failure_grouping",
      });

      const promptResponse = await withTimeout(
        structuredModel.invoke([
          {
            role: "system",
            content: getFailureGroupingPrompt(resultErrors.length),
          },
          {
            role: "user",
            content: JSON.stringify({
              errors: resultErrors.map((resultError) => ({
                id: resultError.id,
                analysisDescription: resultError.result?.analysisConclusion,
              })),
              algorithmicClusters: algorithmicGroups,
            }),
          },
        ]),
        FAILURE_GROUPING_TIMEOUT_MS,
      );

      return {
        groups: validatePromptGroups(promptResponse.groups, resultErrors),
        source: "llm",
      };
    } catch (error) {
      const err = error as Error;
      logger.warn(
        `Falling back to algorithmic grouping for execution ${executionId}: ${err.message}`,
      );

      return {
        groups: algorithmicGroups,
        source: "algorithmic",
      };
    }
  },

  async acceptGroup(
    executionId: string,
    projectId: string,
    issueId: string,
    groupResultErrorIds: string[],
  ): Promise<AcceptFailureGroupResponse> {
    if (!executionId) {
      throw new Error("Execution ID is required");
    }

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    if (!issueId) {
      throw new Error("Issue ID is required");
    }

    if (
      !Array.isArray(groupResultErrorIds) ||
      groupResultErrorIds.length === 0
    ) {
      throw new Error(
        "groupResultErrorIds must contain at least one result error ID",
      );
    }

    const uniqueResultErrorIds = Array.from(new Set(groupResultErrorIds));

    const execution = await executionModel.findById(
      executionId,
      projectId,
      dbClient,
    );
    if (!execution) {
      throw new Error(`Execution with ID ${executionId} not found`);
    }

    const issue = await issueModel.findById(issueId, projectId);
    if (!issue) {
      throw new Error(`Issue with ID ${issueId} not found`);
    }

    const resultErrors = await resultErrorModel.findManyForExecutionContext(
      executionId,
      projectId,
      {
        ids: uniqueResultErrorIds,
      },
    );

    if (resultErrors.length !== uniqueResultErrorIds.length) {
      throw new Error(
        "Some result errors do not belong to the specified execution",
      );
    }

    const existingAssumptions =
      await assumptionModel.findManyByIssueAndResultErrorIds(
        issueId,
        uniqueResultErrorIds,
      );
    const existingResultErrorIds = new Set(
      existingAssumptions
        .map(({ resultErrorId }) => resultErrorId)
        .filter((resultErrorId): resultErrorId is string =>
          Boolean(resultErrorId),
        ),
    );

    const createdAssumptions = [];
    for (const resultErrorId of uniqueResultErrorIds) {
      if (existingResultErrorIds.has(resultErrorId)) {
        continue;
      }

      const assumption = await assumptionService.createAssumption({
        issueId,
        resultErrorId,
        madeBy: "user",
        isConfirmed: true,
        score: 1,
      });
      createdAssumptions.push(assumption);
    }

    return {
      createdAssumptions,
      skippedResultErrorIds: uniqueResultErrorIds.filter((id) =>
        existingResultErrorIds.has(id),
      ),
    };
  },
};

export { FAILURE_GROUPING_TIMEOUT_MS, MAX_FAILURE_GROUPING_ITEMS };
