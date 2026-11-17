// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { resultModel } from "@/models/resultModel";
import { getAiConfigSnapshot, type AiConfigSnapshot } from "@/config/aiConfig";
import {
  GenerativeAiError,
  safeModelIdentifier,
  type AiFailureCategory,
} from "@/lib/generativeAi";
import type { AnalysisLastError } from "@/schemas/analysisMetadataSchemas";
import { testAnalysisService } from "@/services/testAnalysisService";
import type { TestResultAnalysis } from "@/schemas/testAnalysisSchemas";
import getLogger from "@/lib/logger";

const logger = getLogger("stored-result-enrichment");

export type StoredResultAnalysisInput = Parameters<
  typeof testAnalysisService.analyzeStoredResults
>[0];

type AnalysisFailureKind = AnalysisLastError["kind"];

function getFailureKind(
  category: AiFailureCategory | undefined,
  hasConfigurationSetting: boolean,
): AnalysisFailureKind {
  if (hasConfigurationSetting) return "configuration";
  if (category === "authentication/configuration") return "authentication";
  if (category === "rate-limit") return "rate_limit";
  if (category === "unavailable/timeout") return "timeout";
  if (category === "invalid-response") return "invalid_response";
  return "upstream";
}

function getSnapshot(): AiConfigSnapshot | undefined {
  try {
    return getAiConfigSnapshot();
  } catch {
    return undefined;
  }
}

function getAttemptedResultIds(error: unknown): readonly string[] | undefined {
  if (!(error instanceof GenerativeAiError)) return undefined;
  const resultIds = (error as GenerativeAiError & { resultIds?: unknown })
    .resultIds;
  return Array.isArray(resultIds) &&
    resultIds.every((id) => typeof id === "string")
    ? resultIds
    : undefined;
}

async function recordFailure(
  projectId: string,
  results: StoredResultAnalysisInput,
  error: unknown,
  options: { kind?: AnalysisFailureKind; resultIds?: Iterable<string> } = {},
): Promise<void> {
  const ids = options.resultIds ? new Set(options.resultIds) : undefined;
  const selected = results.filter(
    (result) =>
      (result.status === "failed" || result.status === "flaky") &&
      (!ids || ids.has(result.id)),
  );
  if (selected.length === 0) return;

  const diagnostic =
    error instanceof GenerativeAiError ? error.diagnostic : undefined;
  const snapshot = getSnapshot();
  const strategy = snapshot?.classificationStrategy ?? "generative";
  const configuredModel =
    strategy === "decisions"
      ? snapshot?.operations.classification.decisions?.model
      : snapshot?.operations.classification.model;
  const model = safeModelIdentifier(
    diagnostic?.requestedModel ?? configuredModel,
  );
  const failure: AnalysisLastError = {
    version: 1,
    kind:
      options.kind ??
      getFailureKind(
        diagnostic?.category,
        diagnostic?.configurationSetting !== undefined,
      ),
    message:
      options.kind === "persistence"
        ? "Analysis results could not be saved."
        : diagnostic
          ? `Classification request failed (${diagnostic.category}).`
          : "Classification request failed (unknown).",
    occurredAt: new Date().toISOString(),
    connection:
      diagnostic?.connection ??
      snapshot?.connection.connectionLabel ??
      "openai",
    model: model ?? null,
    strategy,
  };

  const failures = new Map<
    string,
    { status: "failed" | "flaky"; failure: AnalysisLastError }
  >();
  for (const result of selected) {
    if (result.status === "failed" || result.status === "flaky") {
      failures.set(result.id, { status: result.status, failure });
    }
  }

  try {
    await resultModel.recordAnalysisFailures({ projectId, failures });
  } catch {
    // Preserve the original classification or persistence error.
    logger.error("Could not persist sanitized analysis failure metadata.");
  }
}

export const storedResultEnrichmentService = {
  async analyzeAndPersist(
    projectId: string,
    results: StoredResultAnalysisInput,
  ): Promise<Map<string, TestResultAnalysis>> {
    let detailed;
    try {
      detailed =
        await testAnalysisService.analyzeStoredResultsDetailed(results);
    } catch (error) {
      const resultIds = getAttemptedResultIds(error);
      await recordFailure(
        projectId,
        results,
        error,
        resultIds ? { resultIds } : {},
      );
      throw error;
    }

    try {
      await resultModel.persistAnalysisBatch({
        projectId,
        analyses: Array.from(detailed.analyses.values()),
        metadata: detailed.metadata,
      });
    } catch (error) {
      await recordFailure(projectId, results, error, {
        kind: "persistence",
        resultIds: detailed.analyses.keys(),
      });
      throw error;
    }
    return detailed.analyses;
  },
};
