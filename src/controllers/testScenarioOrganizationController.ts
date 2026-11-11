// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { Response } from "express";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";
import { TestScenarioNotFoundError } from "@/types/testScenarios";
import type { ZodTypeAny } from "zod";
import { OrganizationError, testScenarioOrganizationService as service } from "@/services/testScenarioOrganizationService";
import { bulkFolderBody, folderCreateBody, folderDeleteQuery, folderRestoreBody, folderMoveRestoreBody, folderUpdateBody, memberBody, memberOrderBody, organizationProjectQuery, suiteCreateBody, suiteUpdateBody, suiteMembershipChangeBody, suiteMembershipRestoreBody, suiteMoveBody, suiteMoveRestoreBody } from "@/schemas/testScenarioOrganizationSchemas";

function parse(res: Response, schema: ZodTypeAny, value: unknown): unknown | undefined {
  const result = schema.safeParse(value);
  if (!result.success) { res.status(400).json({ error: result.error.issues[0]?.message ?? "Invalid request" }); return undefined; }
  return result.data;
}

function error(res: Response, cause: unknown): void {
  if (cause instanceof TestScenarioNotFoundError) { res.status(404).json({ error: cause.message }); return; }
  if (cause instanceof OrganizationError) { res.status(cause.status).json({ error: cause.message }); return; }
  res.status(500).json({ error: "Organization operation failed" });
}

type Body = { projectId: string; [key: string]: unknown };

function routeId(value: string | string[] | undefined): string {
  if (!value || Array.isArray(value)) throw new OrganizationError("Invalid route identifier", 400);
  return value;
}

export const testScenarioOrganizationController = {
  async listFolders(req: AuthenticatedRequest, res: Response) {
    const q = parse(res, organizationProjectQuery, req.query);
    if (!q) return;
    try {
      res.json(
        await service.listFolders((q as { projectId: string }).projectId),
      );
    } catch (e) {
      error(res, e);
    }
  },

  async createFolder(req: AuthenticatedRequest, res: Response) {
    const b = parse(res, folderCreateBody, req.body);
    if (!b) return;
    try {
      res
        .status(201)
        .json(
          await service.createFolder(
            b as Body & {
              name: string;
              description?: string | null;
              parentId?: string | null;
              position?: number;
            },
          ),
        );
    } catch (e) {
      error(res, e);
    }
  },

  async updateFolder(req: AuthenticatedRequest, res: Response) {
    const b = parse(res, folderUpdateBody, {
      ...req.body,
      projectId: req.query.projectId,
    });
    if (!b) return;
    try {
      res.json(
        await service.updateFolder({
          ...(b as Body & {
            name?: string;
            description?: string | null;
            parentId?: string | null;
            position?: number;
          }),
          folderId: routeId(req.params.folderId),
        }),
      );
    } catch (e) {
      error(res, e);
    }
  },

  async deleteFolder(req: AuthenticatedRequest, res: Response) {
    const q = parse(res, folderDeleteQuery, req.query);
    if (!q) return;
    try {
      res.json(
        await service.deleteFolder({
          ...(q as { projectId: string }),
          folderId: routeId(req.params.folderId),
          ...(req.user ? { updatedById: req.user.id } : {}),
        }),
      );
    } catch (e) {
      error(res, e);
    }
  },

  async restoreFolderDeletion(req: AuthenticatedRequest, res: Response) {
    const b = parse(res, folderRestoreBody, req.body);
    if (!b) return;
    try {
      res.json(
        await service.restoreFolderDeletion({
          ...(b as {
            projectId: string;
            restoreData: Parameters<
              typeof service.restoreFolderDeletion
            >[0]["restoreData"];
          }),
          ...(req.user ? { updatedById: req.user.id } : {}),
        }),
      );
    } catch (e) {
      error(res, e);
    }
  },

  async restoreScenarioFolders(req: AuthenticatedRequest, res: Response) {
    const b = parse(res, folderMoveRestoreBody, req.body);
    if (!b) return;
    try {
      res.json(
        await service.restoreScenarioFolders({
          ...(b as {
            projectId: string;
            restoreData: Array<{
              scenarioId: string;
              folderId: string | null;
              expectedFolderId: string | null;
              expectedRevision: number;
            }>;
          }),
          ...(req.user ? { updatedById: req.user.id } : {}),
        }),
      );
    } catch (e) {
      error(res, e);
    }
  },

  async listSuites(req: AuthenticatedRequest, res: Response) {
    const q = parse(res, organizationProjectQuery, req.query);
    if (!q) return;
    try {
      res.json(
        await service.listSuites((q as { projectId: string }).projectId),
      );
    } catch (e) {
      error(res, e);
    }
  },

  async getSuite(req: AuthenticatedRequest, res: Response) {
    const q = parse(res, organizationProjectQuery, req.query);
    if (!q) return;
    try {
      res.json(
        await service.getSuite(
          (q as { projectId: string }).projectId,
          routeId(req.params.suiteId),
        ),
      );
    } catch (e) {
      error(res, e);
    }
  },

  async createSuite(req: AuthenticatedRequest, res: Response) {
    const b = parse(res, suiteCreateBody, req.body);
    if (!b) return;
    try {
      res
        .status(201)
        .json(
          await service.createSuite(
            b as Body & {
              name: string;
              description?: string | null;
              purpose?: string | null;
              release?: string | null;
            },
          ),
        );
    } catch (e) {
      error(res, e);
    }
  },

  async updateSuite(req: AuthenticatedRequest, res: Response) {
    const b = parse(res, suiteUpdateBody, {
      ...req.body,
      projectId: req.query.projectId,
    });
    if (!b) return;
    try {
      res.json(
        await service.updateSuite({
          ...(b as Body & {
            name?: string;
            description?: string | null;
            purpose?: string | null;
            release?: string | null;
          }),
          suiteId: routeId(req.params.suiteId),
        }),
      );
    } catch (e) {
      error(res, e);
    }
  },

  async deleteSuite(req: AuthenticatedRequest, res: Response) {
    const q = parse(res, organizationProjectQuery, req.query);
    if (!q) return;
    try {
      res.json(
        await service.deleteSuite(
          (q as { projectId: string }).projectId,
          routeId(req.params.suiteId),
          req.user?.id,
        ),
      );
    } catch (e) {
      error(res, e);
    }
  },

  async addMembers(req: AuthenticatedRequest, res: Response) {
    const b = parse(res, memberBody, req.body);
    if (!b) return;
    try {
      res.json(
        await service.mutateMembers({
          ...(b as { projectId: string; scenarioIds: string[] }),
          suiteId: routeId(req.params.suiteId),
          operation: "add",
          ...(req.user ? { updatedById: req.user.id } : {}),
        }),
      );
    } catch (e) {
      error(res, e);
    }
  },

  async removeMembers(req: AuthenticatedRequest, res: Response) {
    const b = parse(res, memberBody, req.body);
    if (!b) return;
    try {
      res.json(
        await service.mutateMembers({
          ...(b as { projectId: string; scenarioIds: string[] }),
          suiteId: routeId(req.params.suiteId),
          operation: "remove",
          ...(req.user ? { updatedById: req.user.id } : {}),
        }),
      );
    } catch (e) {
      error(res, e);
    }
  },

  async changeSuiteMembership(req: AuthenticatedRequest, res: Response) {
    const b = parse(res, suiteMembershipChangeBody, req.body);
    if (!b) return;
    try {
      res.json(
        await service.changeSuiteMembership({
          ...(b as {
            projectId: string;
            expectedMembershipRevision: number;
            expectedScenarioIds: string[];
            addScenarioIds: string[];
            removeScenarioIds: string[];
          }),
          suiteId: routeId(req.params.suiteId),
          ...(req.user ? { updatedById: req.user.id } : {}),
        }),
      );
    } catch (e) {
      error(res, e);
    }
  },

  async restoreSuiteMembership(req: AuthenticatedRequest, res: Response) {
    const b = parse(res, suiteMembershipRestoreBody, req.body);
    if (!b) return;
    try {
      res.json(
        await service.restoreSuiteMembership({
          ...(b as {
            projectId: string;
            expectedMembershipRevision: number;
            expectedScenarioIds: string[];
            restoreData: {
              suiteId: string;
              addedScenarioIds: string[];
              removedMembers: Array<{ scenarioId: string; position: number }>;
            };
          }),
          suiteId: routeId(req.params.suiteId),
          ...(req.user ? { updatedById: req.user.id } : {}),
        }),
      );
    } catch (e) {
      error(res, e);
    }
  },

  async moveSuiteMembership(req: AuthenticatedRequest, res: Response) {
    const b = parse(res, suiteMoveBody, req.body);
    if (!b) return;
    try {
      res.json(
        await service.moveSuiteMembership({
          ...(b as {
            projectId: string;
            sourceSuiteId: string;
            destinationSuiteId: string;
            scenarioIds: string[];
            expectedSourceScenarioIds: string[];
            expectedDestinationScenarioIds: string[];
            expectedSourceMembershipRevision: number;
            expectedDestinationMembershipRevision: number;
          }),
          ...(req.user ? { updatedById: req.user.id } : {}),
        }),
      );
    } catch (e) {
      error(res, e);
    }
  },

  async restoreSuiteMove(req: AuthenticatedRequest, res: Response) {
    const b = parse(res, suiteMoveRestoreBody, req.body);
    if (!b) return;
    try {
      res.json(
        await service.restoreSuiteMove({
          ...(b as {
            projectId: string;
            expectedSourceScenarioIds: string[];
            expectedDestinationScenarioIds: string[];
            expectedSourceMembershipRevision: number;
            expectedDestinationMembershipRevision: number;
            restoreData: {
              sourceSuiteId: string;
              destinationSuiteId: string;
              sourceMembers: Array<{ scenarioId: string; position: number }>;
              destinationAddedScenarioIds: string[];
            };
          }),
          ...(req.user ? { updatedById: req.user.id } : {}),
        }),
      );
    } catch (e) {
      error(res, e);
    }
  },

  async orderMembers(req: AuthenticatedRequest, res: Response) {
    const b = parse(res, memberOrderBody, req.body);
    if (!b) return;
    try {
      res.json(
        await service.reorderMembers({
          ...(b as {
            projectId: string;
            expectedMembershipRevision?: number;
            expectedScenarioIds?: string[];
            scenarioIds: string[];
          }),
          suiteId: routeId(req.params.suiteId),
        }),
      );
    } catch (e) {
      error(res, e);
    }
  },

  async bulkFolder(req: AuthenticatedRequest, res: Response) {
    const b = parse(res, bulkFolderBody, req.body);
    if (!b) return;
    try {
      res.json(
        await service.moveScenarios({
          ...(b as {
            projectId: string;
            scenarioIds: string[];
            folderId: string | null;
          }),
          ...(req.user ? { updatedById: req.user.id } : {}),
        }),
      );
    } catch (e) {
      error(res, e);
    }
  },

};
