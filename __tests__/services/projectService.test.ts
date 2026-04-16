import { projectService } from "@/services/projectService";
import { projectModel } from "@/models/projectModel";
import { DEFAULT_PROJECT_CATEGORY_WEIGHTS } from "@/lib/projectCategoryWeights";

jest.mock("@/models/projectModel");

describe("projectService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getProjects", () => {
    it("normalizes missing category weights to defaults", async () => {
      (projectModel.findMany as jest.Mock).mockResolvedValue([
        {
          id: "project-1",
          name: "Project 1",
          description: null,
          isActive: true,
          ownerId: "owner-1",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          categoryWeights: null,
          owner: {
            id: "owner-1",
            name: "Owner",
            email: "owner@example.com",
          },
          _count: {
            executions: 0,
            specs: 0,
            issues: 0,
          },
        },
      ]);

      const projects = await projectService.getProjects({});

      expect(projects[0]?.categoryWeights).toEqual(
        DEFAULT_PROJECT_CATEGORY_WEIGHTS,
      );
    });
  });

  describe("getProjectById", () => {
    it("returns normalized category weights", async () => {
      (projectModel.findById as jest.Mock).mockResolvedValue({
        id: "project-1",
        name: "Project 1",
        description: null,
        isActive: true,
        ownerId: "owner-1",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        categoryWeights: {
          bug: 10,
          infra: 20,
          performance: 30,
          script: 40,
          other: 50,
        },
        owner: {
          id: "owner-1",
          name: "Owner",
          email: "owner@example.com",
        },
        _count: {
          executions: 0,
          specs: 0,
          issues: 0,
        },
      });

      const project = await projectService.getProjectById("project-1");

      expect(project?.categoryWeights).toEqual({
        bug: 10,
        infra: 20,
        performance: 30,
        script: 40,
        other: 50,
      });
    });
  });

  describe("updateProject", () => {
    it("passes category weights to the model and normalizes the response", async () => {
      (projectModel.update as jest.Mock).mockResolvedValue({
        id: "project-1",
        name: "Project 1",
        description: null,
        isActive: true,
        ownerId: "owner-1",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        categoryWeights: {
          bug: 5,
          infra: 10,
          performance: 15,
          script: 20,
          other: 25,
        },
        owner: {
          id: "owner-1",
          name: "Owner",
          email: "owner@example.com",
        },
      });

      const categoryWeights = {
        bug: 5,
        infra: 10,
        performance: 15,
        script: 20,
        other: 25,
      };

      const project = await projectService.updateProject("project-1", {
        categoryWeights,
      });

      expect(projectModel.update).toHaveBeenCalledWith("project-1", {
        categoryWeights,
      });
      expect(project.categoryWeights).toEqual(categoryWeights);
    });
  });

  describe("deleteProject", () => {
    it("should delete project with cascade", async () => {
      const projectId = "project-1";
      (projectModel.deleteWithCascade as jest.Mock).mockResolvedValue({
        id: projectId,
      });

      await projectService.deleteProject(projectId);

      expect(projectModel.deleteWithCascade).toHaveBeenCalledWith(projectId);
    });
  });
});
