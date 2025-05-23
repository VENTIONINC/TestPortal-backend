import { specModel } from "../models/specModel.js";

export const specService = {
  async getSpecById(specId) {
    if (!specId) {
      throw new Error("Spec ID is required");
    }

    // Validate ID format
    const numericId = Number(specId);
    if (isNaN(numericId) || numericId <= 0) {
      throw new Error("Spec ID must be a valid positive number");
    }

    const spec = await specModel.findById(specId);

    if (!spec) {
      throw new Error(`Spec with ID ${specId} not found`);
    }

    // Business logic - parse JSON fields
    try {
      const processedSpec = {
        ...spec,
        tags: spec.tags ? JSON.parse(spec.tags) : [],
        annotations: spec.annotations ? JSON.parse(spec.annotations) : {},
      };

      return processedSpec;
    } catch (parseError) {
      throw new Error(`Failed to parse spec data: ${parseError.message}`);
    }
  },
};
