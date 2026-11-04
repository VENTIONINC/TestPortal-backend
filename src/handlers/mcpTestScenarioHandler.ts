// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { testScenarioIntegrationService } from "@/services/testScenarioIntegrationService";
import { testScenarioService } from "@/services/testScenarioService";
import type { TestScenarioEvidenceParams } from "@/types/testScenarioIntegration";
import type {
  CreateTestScenarioParams,
  AppendTestScenarioStepParams,
  DeleteTestScenarioStepParams,
  ReorderTestScenarioStepsParams,
  TestScenarioMcpDeleteParams,
  TestScenarioMcpDeleteResponse,
  TestScenarioMcpDetailResponse,
  TestScenarioMcpGetParams,
  TestScenarioMcpListParams,
  TestScenarioMcpUpdateParams,
  UpdateTestScenarioStepParams,
  TestScenarioSummaryListResponse,
  TestScenarioResponse,
} from "@/types/testScenarios";

export const mcpTestScenarioHandler = {
  async createTestScenario(
    params: CreateTestScenarioParams,
  ): Promise<TestScenarioResponse> {
    return await testScenarioService.createScenario(params);
  },
  async listTestScenarios(
    params: TestScenarioMcpListParams,
  ): Promise<TestScenarioSummaryListResponse> {
    return await testScenarioService.listScenarios(params);
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

  async appendTestScenarioStep(
    params: AppendTestScenarioStepParams,
  ): Promise<TestScenarioResponse> {
    return await testScenarioService.appendStep(params);
  },

  async updateTestScenarioStep(
    params: UpdateTestScenarioStepParams,
  ): Promise<TestScenarioResponse> {
    return await testScenarioService.updateStep(params);
  },

  async deleteTestScenarioStep(
    params: DeleteTestScenarioStepParams,
  ): Promise<TestScenarioResponse> {
    return await testScenarioService.deleteStep(params);
  },

  async reorderTestScenarioSteps(
    params: ReorderTestScenarioStepsParams,
  ): Promise<TestScenarioResponse> {
    return await testScenarioService.reorderSteps(params);
  },
};
