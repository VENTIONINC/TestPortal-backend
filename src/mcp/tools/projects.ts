import { mcpProjectHandler } from "@/handlers/mcpProjectHandler";
import { createSuccessResponse, createMcpTool } from "@/mcp/helpers/mcpHelpers";
import {
  getProjectsSchema,
  getProjectByIdSchema,
  createProjectSchema,
  updateProjectSchema,
  deleteProjectSchema,
} from "@/mcp/schemas/projectSchemas";
import { getProjectDashboardSchema } from "@/mcp/schemas/dashboardSchemas";
import type { MCPToolResponse } from "@/types";
import type { DashboardGranularity } from "@/types/dashboard";

interface GetProjectsParams {
  ownerId?: string;
  isActive?: boolean;
  name?: string;
}

interface GetProjectByIdParams {
  projectId: string;
}

interface CreateProjectParams {
  name: string;
  description?: string;
  ownerId: string;
}

interface UpdateProjectParams {
  projectId: string;
  name?: string;
  description?: string;
  isActive?: boolean;
}

interface DeleteProjectParams {
  projectId: string;
}

interface GetProjectDashboardParams {
  projectId: string;
  environment: string;
  periodDays?: number;
  type?: string;
  granularity?: DashboardGranularity;
}

export const getProjects = createMcpTool(
  "get-projects",
  "Retrieve all projects with optional filters",
  getProjectsSchema,
  async (params: GetProjectsParams): Promise<MCPToolResponse> => {
    const projects = await mcpProjectHandler.getProjects(params);
    return createSuccessResponse(projects);
  },
  "fetching projects",
);

export const getProjectById = createMcpTool(
  "get-project-by-id",
  "Retrieve a project by ID",
  getProjectByIdSchema,
  async (params: GetProjectByIdParams): Promise<MCPToolResponse> => {
    const project = await mcpProjectHandler.getProjectById(params.projectId);
    return createSuccessResponse(project);
  },
  "fetching project",
);

export const createProject = createMcpTool(
  "create-project",
  "Create a new project with a required owner ID",
  createProjectSchema,
  async (params: CreateProjectParams): Promise<MCPToolResponse> => {
    const project = await mcpProjectHandler.createProject(params);
    return createSuccessResponse(project, "Project created successfully:");
  },
  "creating project",
);

export const updateProject = createMcpTool(
  "update-project",
  "Update a project by ID",
  updateProjectSchema,
  async (params: UpdateProjectParams): Promise<MCPToolResponse> => {
    const { projectId, ...updateData } = params;
    const project = await mcpProjectHandler.updateProject(
      projectId,
      updateData,
    );
    return createSuccessResponse(project, "Project updated successfully:");
  },
  "updating project",
);

export const deleteProject = createMcpTool(
  "delete-project",
  "Delete a project by ID with cascading removal",
  deleteProjectSchema,
  async (params: DeleteProjectParams): Promise<MCPToolResponse> => {
    const project = await mcpProjectHandler.deleteProject(params.projectId);
    return createSuccessResponse(project, "Project deleted successfully:");
  },
  "deleting project",
);

export const getProjectDashboard = createMcpTool(
  "get-project-dashboard",
  "Retrieve dashboard metrics for a project and environment",
  getProjectDashboardSchema,
  async (params: GetProjectDashboardParams): Promise<MCPToolResponse> => {
    const dashboard = await mcpProjectHandler.getDashboard(params);
    return createSuccessResponse(dashboard);
  },
  "fetching project dashboard",
);
