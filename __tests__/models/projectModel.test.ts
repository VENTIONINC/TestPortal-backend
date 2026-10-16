// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";

import { dbClient } from "@/prisma/client";

jest.mock("@/prisma/client", () => ({
  dbClient: {
    project: {
      delete: jest.fn(),
    },
  },
}));

import { projectModel } from "@/models/projectModel";

describe("projectModel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("deleteWithCascade", () => {
    it("deletes the project and relies on database cascades for related data", async () => {
      const projectId = "11111111-1111-1111-1111-111111111111";
      const deletedProject = {
        id: projectId,
        name: "Project",
      };
      const projectDelete = dbClient.project.delete as jest.Mock;
      projectDelete.mockResolvedValue(deletedProject as never);

      const result = await projectModel.deleteWithCascade(projectId);

      expect(result).toBe(deletedProject);
      expect(projectDelete).toHaveBeenCalledWith({
        where: { id: projectId },
      });
    });
  });
});
