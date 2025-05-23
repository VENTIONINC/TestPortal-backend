import { mcpAssumptionHandler } from "../../handlers/mcpAssumptionHandler.js";
import { createSuccessResponse, createMcpTool } from "../helpers/mcpHelpers.js";
import {
  createAssumptionSchema,
  updateAssumptionSchema,
  getAssumptionByIdSchema,
} from "../schemas/assumptionSchemas.js";

export const createAssumption = createMcpTool(
  "create-assumption",
  "Create a new assumption with required issueId and resultErrorId, plus optional fields like description, hypothesis, and evidence",
  createAssumptionSchema,
  async (params) => {
    const assumption = await mcpAssumptionHandler.createAssumption(params);
    return createSuccessResponse(
      assumption,
      "Assumption created successfully:",
    );
  },
  "creating assumption",
);

export const updateAssumption = createMcpTool(
  "update-assumption",
  "Update an assumption by ID. Only real users can modify assumptions. If isConfirmed is false, the assumption will be deleted",
  updateAssumptionSchema,
  async (params) => {
    const { assumptionId, ...updateData } = params;
    const result = await mcpAssumptionHandler.updateAssumption(
      assumptionId,
      updateData,
    );

    if (result.action === "deleted") {
      return createSuccessResponse(
        result,
        "Assumption deleted successfully (confirmed as incorrect):",
      );
    } else {
      return createSuccessResponse(
        result.assumption,
        "Assumption updated successfully:",
      );
    }
  },
  "updating assumption",
);

export const getAssumptionById = createMcpTool(
  "get-assumption-by-id",
  "Retrieve detailed information about a specific assumption by its unique ID",
  getAssumptionByIdSchema,
  async (params) => {
    const { assumptionId } = params;
    const assumption =
      await mcpAssumptionHandler.getAssumptionById(assumptionId);
    return createSuccessResponse(assumption);
  },
  "fetching assumption",
);
