// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { executionController } from "@/controllers/executionController";
import { executionService } from "@/services/executionService";
import { executeController } from "@/test-utils/httpMocks";

describe("executionController shared workspace access", () => {
  it("reads and deletes executions using project scope without owner scope", async () => {
    jest
      .spyOn(executionService, "getExecutionById")
      .mockResolvedValue({ id: "execution-1", projectId: "project-1" } as never);
    jest.spyOn(executionService, "deleteExecution").mockResolvedValue();

    const readResponse = await executeController(
      executionController.getExecutionById,
      {
        params: { executionId: "execution-1" },
        query: { projectId: "project-1" },
      },
    );
    const deleteResponse = await executeController(
      executionController.deleteExecution,
      {
        method: "DELETE",
        params: { executionId: "execution-1" },
        query: { projectId: "project-1" },
      },
    );

    expect(readResponse.statusCode).toBe(200);
    expect(executionService.getExecutionById).toHaveBeenCalledWith(
      "execution-1",
      "project-1",
    );
    expect(deleteResponse.statusCode).toBe(204);
    expect(executionService.deleteExecution).toHaveBeenCalledWith(
      "execution-1",
      "project-1",
    );
  });
});
