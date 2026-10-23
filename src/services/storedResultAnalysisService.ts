// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { resultModel, type ResultAnalysisPersistenceUpdate } from "@/models/resultModel";
import { STORED_RESULT_DECISIONS_MODEL, StoredAnalysisBatchError, testAnalysisService, type StoredResultAnalysisInput } from "@/services/testAnalysisService";
import type { AnalysisLastError } from "@/schemas/analysisMetadataSchemas";
import getLogger from "@/lib/logger";
import { environment } from "@/config/environment";

const logger = getLogger("stored-result-analysis");

export const storedResultAnalysisService = {
  async analyzeAndPersist(
    projectId: string,
    results: StoredResultAnalysisInput[],
  ): Promise<Map<string, import("@/schemas/testAnalysisSchemas").TestResultAnalysis>> {
    let detailed;
    try {
      detailed = await testAnalysisService.analyzeStoredResultsDetailed(results);
    } catch (error) {
      if (error instanceof StoredAnalysisBatchError) {
        await resultModel.recordAnalysisFailures(projectId, error.failures);
      } else {
        const provider = environment.decisions.enabled ? "openrouter" : "openai";
        const apiMode = environment.decisions.enabled ? "decisions" : "generative";
        const failure: AnalysisLastError = {
          version: 1,
          kind: "upstream",
          message: "Analysis provider request failed.",
          occurredAt: new Date().toISOString(),
          attempts: null,
          httpStatus: null,
          provider,
          model: environment.decisions.enabled ? STORED_RESULT_DECISIONS_MODEL : "gpt-4.1-mini",
          apiMode,
        };
        const attempted = new Map(
          results
            .filter(({ status }) => status === "failed" || status === "flaky")
            .map(({ id }) => [id, failure]),
        );
        await resultModel.recordAnalysisFailures(projectId, attempted);
      }
      throw error;
    }
    const updates = new Map<string, ResultAnalysisPersistenceUpdate>();
    for (const [id, analysis] of detailed.analyses) {
      const metadata = detailed.metadata.get(id);
      if (!metadata) throw new Error("Analysis metadata is missing for a completed result.");
      updates.set(id, { analysis, metadata });
    }
    try {
      await resultModel.persistAnalysisBatch(projectId, updates);
    } catch (error) {
      const providerMetadata = updates.values().next().value?.metadata;
      const failure: AnalysisLastError = {
        version: 1,
        kind: "persistence",
        message: "Analysis results could not be saved.",
        occurredAt: new Date().toISOString(),
        attempts: null,
        httpStatus: null,
        provider: providerMetadata?.provider ?? "openai",
        model: providerMetadata?.requestedModel ?? null,
        apiMode: providerMetadata?.apiMode ?? "generative",
      };
      const failures = new Map(Array.from(updates.keys(), (id) => [id, failure]));
      try {
        await resultModel.recordAnalysisFailures(projectId, failures);
      } catch {
        logger.error("Could not persist sanitized analysis failure metadata.");
      }
      throw error;
    }
    return detailed.analyses;
  },
};
