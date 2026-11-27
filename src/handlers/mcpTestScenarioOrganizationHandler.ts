// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { testScenarioOrganizationService as service } from "@/services/testScenarioOrganizationService";

export const mcpTestScenarioOrganizationHandler = {
  listFolders: (input: { projectId: string }) =>
    service.listFolders(input.projectId),
  createFolder: service.createFolder,
  updateFolder: service.updateFolder,
  async deleteFolder(
    input: Parameters<typeof service.deleteFolder>[0],
  ): Promise<{ deleted: true }> {
    const { deleted } = await service.deleteFolder(input);
    return { deleted };
  },
  async moveScenarios(
    input: Parameters<typeof service.moveScenarios>[0],
  ): Promise<{ moved: number }> {
    const { moved } = await service.moveScenarios(input);
    return { moved };
  },
  listSuites: (input: { projectId: string }) =>
    service.listSuites(input.projectId),
  getSuite: (input: { projectId: string; suiteId: string }) =>
    service.getSuite(input.projectId, input.suiteId),
  createSuite: service.createSuite,
  updateSuite: service.updateSuite,
  deleteSuite: (
    input: { projectId: string; suiteId: string },
    updatedById?: string,
  ) => service.deleteSuite(input.projectId, input.suiteId, updatedById),
  addMembers: (input: {
    projectId: string;
    suiteId: string;
    scenarioIds: string[];
    updatedById?: string;
  }) => service.mutateMembers({ ...input, operation: "add" }),
  removeMembers: (input: {
    projectId: string;
    suiteId: string;
    scenarioIds: string[];
    updatedById?: string;
  }) => service.mutateMembers({ ...input, operation: "remove" }),
  reorderMembers: service.reorderMembers,
};
