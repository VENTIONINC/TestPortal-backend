// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { issueController } from "@/controllers/issueController";
import { issueService } from "@/services/issueService";
import { executeController } from "@/test-utils/httpMocks";

describe("issueController shared workspace access", () => {
  it("reads and deletes issues using project scope without owner scope", async () => {
    jest
      .spyOn(issueService, "getIssueById")
      .mockResolvedValue({ id: "issue-1", projectId: "project-1" } as never);
    jest
      .spyOn(issueService, "deleteIssue")
      .mockResolvedValue({ id: "issue-1", projectId: "project-1" } as never);

    const readResponse = await executeController(issueController.getIssueById, {
      params: { issueId: "issue-1" },
      query: { projectId: "project-1" },
    });
    const deleteResponse = await executeController(issueController.deleteIssue, {
      method: "DELETE",
      params: { issueId: "issue-1" },
      query: { projectId: "project-1" },
    });

    expect(readResponse.statusCode).toBe(200);
    expect(issueService.getIssueById).toHaveBeenCalledWith(
      "issue-1",
      "project-1",
    );
    expect(deleteResponse.statusCode).toBe(200);
    expect(issueService.deleteIssue).toHaveBeenCalledWith(
      "issue-1",
      "project-1",
    );
  });
});
