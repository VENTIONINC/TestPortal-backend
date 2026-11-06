// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { projectService } from "@/services/projectService";
import { getAvailableProjects } from "@/mcp/tools/projects";

describe("MCP get-available-projects", () => {
  afterEach(() => jest.restoreAllMocks());

  it("returns active projects available to project-scoped MCP tools", async () => {
    const projects = [
      { id: "project-1", name: "Project One" },
      { id: "default-project", name: "Default Project" },
    ];
    const getProjects = jest
      .spyOn(projectService, "getProjects")
      .mockResolvedValue(projects as never);
    const response = await getAvailableProjects[3]({});

    expect(getProjects).toHaveBeenCalledWith({ isActive: true });
    expect(response).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(projects, null, 2),
        },
      ],
    });
  });
});
