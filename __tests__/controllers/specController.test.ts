// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { specController } from "@/controllers/specController";
import { specService } from "@/services/specService";
import { executeController } from "@/test-utils/httpMocks";

describe("specController shared workspace access", () => {
  it("reads and deletes specs using project scope without owner scope", async () => {
    jest
      .spyOn(specService, "getSpecById")
      .mockResolvedValue({ id: "spec-1", projectId: "project-1" } as never);
    jest.spyOn(specService, "deleteSpec").mockResolvedValue();

    const readResponse = await executeController(specController.getSpecById, {
      params: { specId: "spec-1" },
      query: { projectId: "project-1" },
    });
    const deleteResponse = await executeController(specController.deleteSpec, {
      method: "DELETE",
      params: { specId: "spec-1" },
      query: { projectId: "project-1" },
    });

    expect(readResponse.statusCode).toBe(200);
    expect(specService.getSpecById).toHaveBeenCalledWith(
      "spec-1",
      "project-1",
    );
    expect(deleteResponse.statusCode).toBe(204);
    expect(specService.deleteSpec).toHaveBeenCalledWith(
      "spec-1",
      "project-1",
    );
  });
});
