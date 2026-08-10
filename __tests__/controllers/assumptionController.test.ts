// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { assumptionController } from "@/controllers/assumptionController";
import { assumptionService } from "@/services/assumptionService";
import { executeController } from "@/test-utils/httpMocks";

describe("assumptionController shared workspace access", () => {
  it("reads and deletes assumptions using project scope without owner scope", async () => {
    jest
      .spyOn(assumptionService, "getAssumptionById")
      .mockResolvedValue({ id: "assumption-1" } as never);
    jest.spyOn(assumptionService, "deleteAssumption").mockResolvedValue();

    const readResponse = await executeController(
      assumptionController.getAssumptionById,
      {
        params: { assumptionId: "assumption-1" },
        query: { projectId: "project-1" },
      },
    );
    const deleteResponse = await executeController(
      assumptionController.deleteAssumption,
      {
        method: "DELETE",
        params: { assumptionId: "assumption-1" },
        query: { projectId: "project-1" },
      },
    );

    expect(readResponse.statusCode).toBe(200);
    expect(assumptionService.getAssumptionById).toHaveBeenCalledWith(
      "assumption-1",
      "project-1",
    );
    expect(deleteResponse.statusCode).toBe(204);
    expect(assumptionService.deleteAssumption).toHaveBeenCalledWith(
      "assumption-1",
      "project-1",
    );
  });
});
