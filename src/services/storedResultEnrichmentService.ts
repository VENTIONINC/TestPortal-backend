// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { resultModel } from "@/models/resultModel";
import { testAnalysisService } from "@/services/testAnalysisService";
import type { TestResultAnalysis } from "@/schemas/testAnalysisSchemas";

export type StoredResultAnalysisInput = Parameters<
  typeof testAnalysisService.analyzeStoredResults
>[0];

export const storedResultEnrichmentService = {
  async analyzeAndPersist(
    projectId: string,
    results: StoredResultAnalysisInput,
  ): Promise<Map<string, TestResultAnalysis>> {
    const analyses = await testAnalysisService.analyzeStoredResults(results);
    await resultModel.persistAnalysisBatch({
      projectId,
      analyses: Array.from(analyses.values()),
    });
    return analyses;
  },
};
