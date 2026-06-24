// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { specService } from "@/services/specService";
import type { StructuredSpec } from "@/types";

export const mcpSpecHandler = {
  async getSpecById(specId: string, projectId: string): Promise<StructuredSpec> {
    return await specService.getSpecById(specId, projectId);
  },
};
