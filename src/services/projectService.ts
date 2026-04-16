import { projectModel } from "@/models/projectModel";
import type { Project } from "@prisma/client";
import {
  normalizeProjectCategoryWeights,
  type ProjectCategoryWeights,
} from "@/lib/projectCategoryWeights";

export interface CreateProjectParams {
  name: string;
  description?: string;
  ownerId: string;
  categoryWeights: ProjectCategoryWeights;
}

export interface UpdateProjectParams {
  name?: string;
  description?: string;
  isActive?: boolean;
  categoryWeights?: ProjectCategoryWeights;
}

export interface GetProjectsParams {
  ownerId?: string;
  isActive?: boolean;
  name?: string;
}

export interface ProjectWithDetails extends Omit<Project, "categoryWeights"> {
  categoryWeights: ProjectCategoryWeights;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    executions: number;
    specs: number;
    issues: number;
  };
}

type ProjectWithCategoryWeights = Omit<Project, "categoryWeights"> & {
  categoryWeights: ProjectCategoryWeights;
};

function normalizeProject<T>(
  project: T & { categoryWeights?: unknown },
): Omit<T, "categoryWeights"> & { categoryWeights: ProjectCategoryWeights } {
  return {
    ...project,
    categoryWeights: normalizeProjectCategoryWeights(project.categoryWeights),
  };
}

export const projectService = {
  async getProjects(params: GetProjectsParams): Promise<ProjectWithDetails[]> {
    const projects = await projectModel.findMany(params);
    return projects.map((project) =>
      normalizeProject(project),
    ) as ProjectWithDetails[];
  },

  async getProjectById(id: string): Promise<ProjectWithDetails | null> {
    const project = await projectModel.findById(id);
    return project ? (normalizeProject(project) as ProjectWithDetails) : null;
  },

  async getUserProjects(userId: string): Promise<ProjectWithCategoryWeights[]> {
    const projects = await projectModel.findUserProjects(userId);
    return projects.map((project) =>
      normalizeProject(project),
    ) as ProjectWithCategoryWeights[];
  },

  async createProject(params: CreateProjectParams): Promise<ProjectWithDetails> {
    // Check if project name already exists
    const existingProject = await projectModel.findByName(params.name);
    if (existingProject) {
      throw new Error(`Project with name '${params.name}' already exists`);
    }

    const project = await projectModel.create(params);
    return normalizeProject(project) as ProjectWithDetails;
  },

  async updateProject(
    id: string,
    params: UpdateProjectParams,
  ): Promise<ProjectWithDetails> {
    // If updating name, check if it already exists
    if (params.name) {
      const existingProject = await projectModel.findByName(params.name);
      if (existingProject && existingProject.id !== id) {
        throw new Error(`Project with name '${params.name}' already exists`);
      }
    }

    const project = await projectModel.update(id, params);
    return normalizeProject(project) as ProjectWithDetails;
  },

  async deleteProject(id: string): Promise<Project> {
    // Use cascading deletion with transaction to ensure atomicity
    return await projectModel.deleteWithCascade(id);
  },
};
