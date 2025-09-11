import { projectModel } from "@/models/projectModel";
import type { Project } from "@prisma/client";

export interface CreateProjectParams {
  name: string;
  description?: string;
  ownerId: number;
}

export interface UpdateProjectParams {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface GetProjectsParams {
  ownerId?: number;
  isActive?: boolean;
  name?: string;
}

export interface ProjectWithDetails extends Project {
  owner: {
    id: number;
    name: string;
    email: string;
  };
  _count: {
    executions: number;
    specs: number;
    issues: number;
  };
}

export const projectService = {
  async getProjects(params: GetProjectsParams): Promise<ProjectWithDetails[]> {
    return await projectModel.findMany(params) as ProjectWithDetails[];
  },

  async getProjectById(id: number): Promise<ProjectWithDetails | null> {
    return await projectModel.findById(id);
  },

  async getUserProjects(userId: number): Promise<Project[]> {
    return await projectModel.findUserProjects(userId);
  },

  async createProject(params: CreateProjectParams): Promise<Project> {
    // Check if project name already exists
    const existingProject = await projectModel.findByName(params.name);
    if (existingProject) {
      throw new Error(`Project with name '${params.name}' already exists`);
    }

    return await projectModel.create(params);
  },

  async updateProject(id: number, params: UpdateProjectParams): Promise<Project> {
    // If updating name, check if it already exists
    if (params.name) {
      const existingProject = await projectModel.findByName(params.name);
      if (existingProject && existingProject.id !== id) {
        throw new Error(`Project with name '${params.name}' already exists`);
      }
    }

    return await projectModel.update(id, params);
  },

  async deleteProject(id: number): Promise<Project> {
    // Check if project has associated data
    const project = await projectModel.findById(id);
    if (project && (project._count.executions > 0 || project._count.specs > 0 || project._count.issues > 0)) {
      throw new Error("Cannot delete project with existing data. Please move or delete associated executions, specs, and issues first.");
    }

    return await projectModel.delete(id);
  },

  async validateProjectExists(projectId: number): Promise<boolean> {
    const project = await projectModel.findById(projectId);
    return !!project && project.isActive;
  },
};