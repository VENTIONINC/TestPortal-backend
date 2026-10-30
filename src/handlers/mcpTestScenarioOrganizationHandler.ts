// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { testScenarioOrganizationService as service } from "@/services/testScenarioOrganizationService";

export const mcpTestScenarioOrganizationHandler = {
  listFolders: (input: { projectId: string }) =>
    service.listFolders(input.projectId),
  createFolder: service.createFolder,
  updateFolder: service.updateFolder,
  deleteFolder: service.deleteFolder,
  moveScenarios: service.moveScenarios,
  listSuites: (input: { projectId: string }) =>
    service.listSuites(input.projectId),
  getSuite: (input: { projectId: string; suiteId: string }) =>
    service.getSuite(input.projectId, input.suiteId),
  createSuite: service.createSuite,
  updateSuite: service.updateSuite,
  deleteSuite: (input: { projectId: string; suiteId: string }) =>
    service.deleteSuite(input.projectId, input.suiteId),
  addMembers: (input: {
    projectId: string;
    suiteId: string;
    scenarioIds: string[];
  }) => service.mutateMembers({ ...input, operation: "add" }),
  removeMembers: (input: {
    projectId: string;
    suiteId: string;
    scenarioIds: string[];
  }) => service.mutateMembers({ ...input, operation: "remove" }),
  reorderMembers: service.reorderMembers,
};
