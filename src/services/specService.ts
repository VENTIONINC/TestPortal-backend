import { specModel } from "@/models/specModel";
import { normalizeJsonStringArray, normalizeJsonUnknownArray } from "@/lib/jsonPayloads";
import type { StructuredSpec } from "@/types";

export const specService = {
  async getSpecById(specId: string, projectId: string): Promise<StructuredSpec> {
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

    return {
      ...spec,
      tags: normalizeJsonStringArray(spec.tags),
      annotations: normalizeJsonUnknownArray(spec.annotations),
    };
  },

  async deleteSpec(specId: string, projectId: string): Promise<void> {
    if (!specId) {
      throw new Error("Spec ID is required");
    }

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    await specModel.delete(specId, projectId);
  },
};
