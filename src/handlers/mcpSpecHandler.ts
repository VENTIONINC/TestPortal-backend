// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import {
  specService,
  type ListSpecsInput,
  type ListSpecsResponse,
} from "@/services/specService";
import type { StructuredSpec } from "@/types";

export const mcpSpecHandler = {
  async listSpecs(input: ListSpecsInput): Promise<ListSpecsResponse> {
    return await specService.listSpecs(input);
  },
  async getSpecById(
    specId: string,
    projectId: string,
  ): Promise<StructuredSpec> {
    return await specService.getSpecById(specId, projectId);
  },
};
