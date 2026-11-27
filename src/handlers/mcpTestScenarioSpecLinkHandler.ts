// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { testScenarioIntegrationService } from "@/services/testScenarioIntegrationService";
import type {
  ListSpecLinksActionInput,
  MutateSpecLinkActionInput,
} from "@/mcp/schemas/testScenarioSpecLinkSchemas";
import type {
  TestScenarioSpecLinksResponse,
  TestScenarioSpecLinkResponse,
} from "@/types/testScenarioIntegration";

export const mcpTestScenarioSpecLinkHandler = {
  async list(
    input: ListSpecLinksActionInput,
  ): Promise<TestScenarioSpecLinksResponse> {
    return await testScenarioIntegrationService.listSpecLinks(input);
  },
  async add(
    input: MutateSpecLinkActionInput,
  ): Promise<TestScenarioSpecLinkResponse> {
    return await testScenarioIntegrationService.addSpecLink(input);
  },
  async remove(
    input: MutateSpecLinkActionInput,
  ): Promise<MutateSpecLinkActionInput & { removed: true }> {
    await testScenarioIntegrationService.removeSpecLink(input);
    return { ...input, removed: true };
  },
};
