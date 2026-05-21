// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { projectService } from "@/services/projectService";
import { projectModel } from "@/models/projectModel";

// Mock dependencies
jest.mock("@/models/projectModel");

describe("projectService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("deleteProject", () => {
    const projectId = "project-1";

    it("should delete project with cascade", async () => {
      (projectModel.deleteWithCascade as jest.Mock).mockResolvedValue({
        id: projectId,
      });

      await projectService.deleteProject(projectId);

      expect(projectModel.deleteWithCascade).toHaveBeenCalledWith(projectId);
    });
  });
});
