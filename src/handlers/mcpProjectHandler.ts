import { projectService } from "@/services/projectService";
import { dashboardService } from "@/services/dashboardService";
import type {
  CreateProjectParams,
  GetProjectsParams,
  ProjectWithDetails,
  UpdateProjectParams,
} from "@/services/projectService";
import type {
  DashboardGranularity,
  DashboardResponse,
} from "@/types/dashboard";
import type { Project } from "@prisma/client";

interface DashboardParams {
  projectId: string;
  environment: string;
  periodDays?: number;
  type?: string;
  granularity?: DashboardGranularity;
}

const normalizeDashboardGranularity = (
  periodDays: number,
  granularity?: DashboardGranularity,
): DashboardGranularity => {
  if (granularity) {
    return granularity;
  }

  return periodDays > 90 ? "weekly" : "daily";
};

export const mcpProjectHandler = {
  async getProjects(params: GetProjectsParams): Promise<ProjectWithDetails[]> {
    return await projectService.getProjects(params);
  },

  async getProjectById(projectId: string): Promise<ProjectWithDetails | null> {
    return await projectService.getProjectById(projectId);
  },

  async createProject(params: CreateProjectParams): Promise<Project> {
    return await projectService.createProject(params);
  },

  async updateProject(
    projectId: string,
    params: UpdateProjectParams,
  ): Promise<Project> {
    return await projectService.updateProject(projectId, params);
  },

  async deleteProject(projectId: string): Promise<Project> {
    return await projectService.deleteProject(projectId);
  },

  async getDashboard(params: DashboardParams): Promise<DashboardResponse> {
    const {
      projectId,
      environment,
      periodDays = 30,
      type,
      granularity,
    } = params;

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    if (!environment) {
      throw new Error("Environment is required");
    }

    const resolvedGranularity = normalizeDashboardGranularity(
      periodDays,
      granularity,
    );

    return await dashboardService.getDashboard(
      projectId,
      environment,
      periodDays,
      type,
      resolvedGranularity,
    );
  },
};
