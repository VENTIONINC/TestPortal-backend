// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0
import type { Response } from "express";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";
import { testScenarioOrganizationController as controller } from "@/controllers/testScenarioOrganizationController";
import { testScenarioOrganizationService as service } from "@/services/testScenarioOrganizationService";
jest.mock("@/services/testScenarioOrganizationService", () => ({
  OrganizationError: class extends Error {},
  testScenarioOrganizationService: {
    moveScenarios: jest.fn().mockResolvedValue({ moved: 1 }),
  },
}));
it("uses the authenticated updater rather than client attribution", async () => {
  const projectId = "00000000-0000-4000-8000-000000000001";
  const scenarioId = "00000000-0000-4000-8000-000000000002";
  const req = {
    body: {
      projectId,
      scenarioIds: [scenarioId],
      folderId: null,
    },
    user: { id: "authenticated" },
  } as AuthenticatedRequest;
  const res = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  } as unknown as Response;
  await controller.bulkFolder(
    {
      ...req,
      body: { ...req.body, updatedById: "forged" },
    } as AuthenticatedRequest,
    res,
  );
  expect(res.status).toHaveBeenCalledWith(400);
  expect(service.moveScenarios).not.toHaveBeenCalled();
  await controller.bulkFolder(req, res);
  expect(service.moveScenarios).toHaveBeenCalledWith({
    projectId,
    scenarioIds: [scenarioId],
    folderId: null,
    updatedById: "authenticated",
  });
});
