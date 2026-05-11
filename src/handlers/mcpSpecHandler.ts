// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { specService } from "@/services/specService";
import type { PrismaSpec } from "@/types";

interface ProcessedSpec extends Omit<PrismaSpec, "tags" | "annotations"> {
  tags: string[];
  annotations: Record<string, unknown>;
}

export const mcpSpecHandler = {
  async getSpecById(specId: string, projectId: string): Promise<ProcessedSpec> {
    return await specService.getSpecById(specId, projectId);
  },
};
