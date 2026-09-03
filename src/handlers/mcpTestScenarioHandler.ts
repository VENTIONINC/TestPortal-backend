// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { testScenarioIntegrationService } from "@/services/testScenarioIntegrationService";
import { testScenarioService } from "@/services/testScenarioService";
import type { TestScenarioEvidenceParams } from "@/types/testScenarioIntegration";
import type {
  TestScenarioMcpDeleteParams,
  TestScenarioMcpDeleteResponse,
  TestScenarioMcpDetailResponse,
  TestScenarioMcpGetParams,
  TestScenarioMcpListParams,
  TestScenarioMcpUpdateParams,
  TestScenarioSummaryListResponse,
  TestScenarioResponse,
} from "@/types/testScenarios";

export const mcpTestScenarioHandler = {
  async listTestScenarios(
    params: TestScenarioMcpListParams,
  ): Promise<TestScenarioSummaryListResponse> {
    return await testScenarioService.listScenarioSummaries(params);
  },

  async getTestScenario(
    params: TestScenarioMcpGetParams,
  ): Promise<TestScenarioMcpDetailResponse> {
    const { scenarioId, projectId } = params;
    const resultParams: TestScenarioEvidenceParams = {
      scenarioId,
      projectId,
    };
    const issueParams: TestScenarioEvidenceParams = {
      scenarioId,
      projectId,
    };

    if (params.resultPage !== undefined) {
      resultParams.page = params.resultPage;
    }
    if (params.resultLimit !== undefined) {
      resultParams.limit = params.resultLimit;
    }
    if (params.issuePage !== undefined) {
      issueParams.page = params.issuePage;
    }
    if (params.issueLimit !== undefined) {
      issueParams.limit = params.issueLimit;
    }

    const [scenario, resultEvidence, issueEvidence] = await Promise.all([
      testScenarioService.getScenarioById(scenarioId, projectId),
      testScenarioIntegrationService.getResults(resultParams),
      testScenarioIntegrationService.getIssues(issueParams),
    ]);

    return {
      scenario,
      resultEvidence,
      issueEvidence,
    };
  },

  async updateTestScenario(
    params: TestScenarioMcpUpdateParams,
  ): Promise<TestScenarioResponse> {
    return await testScenarioService.updateScenario(params);
  },

  async deleteTestScenario(
    params: TestScenarioMcpDeleteParams,
  ): Promise<TestScenarioMcpDeleteResponse> {
    await testScenarioService.deleteScenario(
      params.scenarioId,
      params.projectId,
    );

    return {
      scenarioId: params.scenarioId,
      projectId: params.projectId,
      deleted: true,
    };
  },
};
