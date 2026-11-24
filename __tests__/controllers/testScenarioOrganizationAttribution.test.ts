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
    deleteFolder: jest.fn().mockResolvedValue({ deleted: true, restoreData: { folders: [], scenarios: [] } }),
    restoreFolderDeletion: jest.fn().mockResolvedValue({ restored: true }),
    restoreScenarioFolders: jest.fn().mockResolvedValue([]),
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
it("deletes folders without a disposition and delegates guarded restoration", async () => {
  const projectId = "00000000-0000-4000-8000-000000000001";
  const folderId = "00000000-0000-4000-8000-000000000002";
  const res = { json: jest.fn(), status: jest.fn().mockReturnThis() } as unknown as Response;
  await controller.deleteFolder({ query: { projectId }, params: { folderId }, user: { id: "authenticated" } } as unknown as AuthenticatedRequest, res);
  expect(service.deleteFolder).toHaveBeenCalledWith({ projectId, folderId, updatedById: "authenticated" });
  await controller.deleteFolder({ query: { projectId, disposition: "parent" }, params: { folderId } } as unknown as AuthenticatedRequest, res);
  expect(service.deleteFolder).toHaveBeenCalledTimes(1);
});
it("validates and delegates both folder restoration requests", async () => {
  const projectId = "00000000-0000-4000-8000-000000000001";
  const folderId = "00000000-0000-4000-8000-000000000002";
  const scenarioId = "00000000-0000-4000-8000-000000000003";
  const restoreData = { folders: [{ id: folderId, projectId, name: "Folder", description: null, parentId: null, position: 0 }], scenarios: [{ scenarioId, folderId, expectedRevision: 2 }] };
  const res = { json: jest.fn(), status: jest.fn().mockReturnThis() } as unknown as Response;
  await controller.restoreFolderDeletion({ body: { projectId, restoreData }, user: { id: "authenticated" } } as AuthenticatedRequest, res);
  expect(service.restoreFolderDeletion).toHaveBeenCalledWith({ projectId, restoreData, updatedById: "authenticated" });
  const moveRestoreData = [{ scenarioId, folderId: null, expectedFolderId: folderId, expectedRevision: 3 }];
  await controller.restoreScenarioFolders({ body: { projectId, restoreData: moveRestoreData } } as AuthenticatedRequest, res);
  expect(service.restoreScenarioFolders).toHaveBeenCalledWith({ projectId, restoreData: moveRestoreData });
});
