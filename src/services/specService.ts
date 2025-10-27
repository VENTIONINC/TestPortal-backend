import { specModel } from "@/models/specModel";
import type { PrismaSpec } from "@/types";

interface ProcessedSpec extends Omit<PrismaSpec, "tags" | "annotations"> {
  tags: string[];
  annotations: Record<string, unknown>;
}

export const specService = {
  async getSpecById(specId: string, projectId: string): Promise<ProcessedSpec> {
    if (!specId) {
      throw new Error("Spec ID is required");
    }

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const spec = await specModel.findById(specId, projectId);

    if (!spec) {
      throw new Error(`Spec with ID ${specId} not found`);
    }

    // Business logic - parse JSON fields
    try {
      const processedSpec: ProcessedSpec = {
        ...spec,
        tags: spec.tags ? JSON.parse(spec.tags) : [],
        annotations: spec.annotations ? JSON.parse(spec.annotations) : {},
      };

      return processedSpec;
    } catch (parseError) {
      const error = parseError as Error;
      throw new Error(`Failed to parse spec data: ${error.message}`);
    }
  },
};
