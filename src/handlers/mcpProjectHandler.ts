// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { projectService } from "@/services/projectService";

export interface AvailableProject {
  id: string;
  name: string;
}

export const mcpProjectHandler = {
  async getAvailableProjects(): Promise<AvailableProject[]> {
    const projects = await projectService.getProjects({ isActive: true });
    return projects.map(({ id, name }) => ({ id, name }));
  },
};
