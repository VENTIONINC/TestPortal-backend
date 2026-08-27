// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";

import { assumptionController } from "@/controllers/assumptionController";
import { assumptionService } from "@/services/assumptionService";
import { executeController } from "@/test-utils/httpMocks";

describe("assumptionController.updateAssumption", () => {
  afterEach(() => jest.restoreAllMocks());

  it("passes the authenticated reviewer ID to confirmation", async () => {
    const assumption = {
      id: "assumption-1",
      issueId: "issue-1",
      resultErrorId: "error-1",
      madeBy: "user",
      isConfirmed: true,
      score: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      issue: { id: "issue-1", category: "bug" },
    };
    const service = jest
      .spyOn(assumptionService, "updateAssumption")
      .mockResolvedValue({ action: "updated", assumption } as never);

    const response = await executeController(
      assumptionController.updateAssumption,
      {
        method: "PATCH",
        params: { assumptionId: "assumption-1" },
        body: { madeBy: "user", isConfirmed: true },
        user: {
          id: "reviewer-1",
          name: "Reviewer",
          email: "reviewer@example.com",
          status: "active",
          role: "member",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    );

    expect(service).toHaveBeenCalledWith(
      "assumption-1",
      { madeBy: "user", isConfirmed: true },
      "reviewer-1",
    );
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(assumption);
  });
});
