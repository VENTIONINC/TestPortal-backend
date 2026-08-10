// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { projectController } from "@/controllers/projectController";
import { projectService } from "@/services/projectService";
import { executeController } from "@/test-utils/httpMocks";

const ownerId = "11111111-1111-4111-8111-111111111111";
const memberId = "22222222-2222-4222-8222-222222222222";
const projectId = "33333333-3333-4333-8333-333333333333";

const activeMember = {
  id: memberId,
  name: "Workspace Member",
  email: "member@example.com",
  status: "active" as const,
  role: "member" as const,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const foreignProject = {
  id: projectId,
  name: "Owner Project",
  description: "Shared with the workspace",
  isActive: true,
  ownerId,
  categoryWeights: {
    bug: 100,
    infra: 75,
    performance: 50,
    script: 25,
    other: 10,
  },
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  owner: {
    id: ownerId,
    name: "Project Owner",
    email: "owner@example.com",
  },
  _count: { executions: 1, specs: 1, issues: 1 },
};

describe("projectController shared workspace access", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("lets an active member list and read a project owned by another user", async () => {
    jest
      .spyOn(projectService, "getProjects")
      .mockResolvedValue([foreignProject] as never);
    jest
      .spyOn(projectService, "getProjectById")
      .mockResolvedValue(foreignProject as never);

    const listResponse = await executeController(projectController.getProjects, {
      user: activeMember,
    });
    const readResponse = await executeController(
      projectController.getProjectById,
      { params: { id: projectId }, user: activeMember },
    );

    expect(projectService.getProjects).toHaveBeenCalledWith({});
    expect(listResponse.body).toEqual([foreignProject]);
    expect(projectService.getProjectById).toHaveBeenCalledWith(projectId);
    expect(readResponse.body).toEqual(foreignProject);
  });

  it("lets an active member update and delete a project owned by another user", async () => {
    jest
      .spyOn(projectService, "updateProject")
      .mockResolvedValue({ ...foreignProject, name: "Renamed" } as never);
    jest
      .spyOn(projectService, "deleteProject")
      .mockResolvedValue(foreignProject as never);

    const updateResponse = await executeController(
      projectController.updateProject,
      {
        method: "PUT",
        params: { id: projectId },
        user: activeMember,
        body: { name: "  Renamed  " },
      },
    );
    const deleteResponse = await executeController(
      projectController.deleteProject,
      { method: "DELETE", params: { id: projectId }, user: activeMember },
    );

    expect(projectService.updateProject).toHaveBeenCalledWith(projectId, {
      name: "Renamed",
    });
    expect(updateResponse.statusCode).toBe(200);
    expect(projectService.deleteProject).toHaveBeenCalledWith(projectId);
    expect(deleteResponse.statusCode).toBe(204);
  });

  it("keeps normal validation and does not pass ownerId to updates", async () => {
    const updateSpy = jest
      .spyOn(projectService, "updateProject")
      .mockResolvedValue(foreignProject as never);

    const invalidResponse = await executeController(
      projectController.updateProject,
      {
        method: "PUT",
        params: { id: projectId },
        user: activeMember,
        body: { name: "   " },
      },
    );

    expect(invalidResponse.statusCode).toBe(400);
    expect(updateSpy).not.toHaveBeenCalled();

    await executeController(projectController.updateProject, {
      method: "PUT",
      params: { id: projectId },
      user: activeMember,
      body: { description: "Updated", ownerId: memberId },
    });

    expect(updateSpy).toHaveBeenCalledWith(projectId, {
      description: "Updated",
    });
  });
});
