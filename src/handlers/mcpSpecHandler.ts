import { specService } from "@/services/specService";
import type { PrismaSpec } from "@/types";

interface ProcessedSpec extends Omit<PrismaSpec, "tags" | "annotations"> {
  tags: string[];
  annotations: Record<string, unknown>;
}

export const mcpSpecHandler = {
  async getSpecById(specId: string | number): Promise<ProcessedSpec> {
    return await specService.getSpecById(specId);
  },
};
