import { mcpAssumptionHandler } from "@/handlers/mcpAssumptionHandler";
import { createSuccessResponse, createMcpTool } from "@/mcp/helpers/mcpHelpers";
import {
  createAssumptionSchema,
  updateAssumptionSchema,
  getAssumptionByIdSchema,
  deleteAssumptionSchema,
} from "@/mcp/schemas/assumptionSchemas";
import type {
  CreateAssumptionRequest,
  UpdateAssumptionRequest,
  MCPToolResponse,
} from "@/types";

interface UpdateAssumptionParams extends UpdateAssumptionRequest {
  assumptionId: string;
}

interface GetAssumptionByIdParams {
  assumptionId: string;
  projectId: string;
}

interface DeleteAssumptionParams {
  assumptionId: string;
  projectId: string;
}

export const createAssumption = createMcpTool(
  "create-assumption",
  "Create a new assumption with required issueId and resultErrorId, plus optional fields like description, hypothesis, and evidence",
  createAssumptionSchema,
  async (params: CreateAssumptionRequest): Promise<MCPToolResponse> => {
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
  async (params: UpdateAssumptionParams): Promise<MCPToolResponse> => {
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
  async (params: GetAssumptionByIdParams): Promise<MCPToolResponse> => {
    const { assumptionId, projectId } = params;
    const assumption =
      await mcpAssumptionHandler.getAssumptionById(assumptionId, projectId);
    return createSuccessResponse(assumption);
  },
  "fetching assumption",
);

export const deleteAssumption = createMcpTool(
  "delete-assumption",
  "Delete an assumption by ID",
  deleteAssumptionSchema,
  async (params: DeleteAssumptionParams): Promise<MCPToolResponse> => {
    const { assumptionId, projectId } = params;
    await mcpAssumptionHandler.deleteAssumption(assumptionId, projectId);
    return createSuccessResponse(
      { assumptionId, projectId },
      "Assumption deleted successfully:",
    );
  },
  "deleting assumption",
);
