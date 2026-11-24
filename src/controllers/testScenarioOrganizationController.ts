// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { Response } from "express";
import type { ZodType, ZodTypeDef } from "zod";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";
import { TestScenarioNotFoundError } from "@/types/testScenarios";
import {
  OrganizationError,
  testScenarioOrganizationService as service,
} from "@/services/testScenarioOrganizationService";
import {
  bulkFolderBody,
  folderCreateBody,
  folderDeleteQuery,
  folderRestoreBody,
  folderMoveRestoreBody,
  folderUpdateBody,
  memberBody,
  memberOrderBody,
  organizationProjectQuery,
  suiteCreateBody,
  suiteUpdateBody,
  suiteMembershipChangeBody,
  suiteMembershipRestoreBody,
  suiteMoveBody,
  suiteMoveRestoreBody,
} from "@/schemas/testScenarioOrganizationSchemas";

function parse<Output>(
  res: Response,
  schema: ZodType<Output, ZodTypeDef, unknown>,
  value: unknown,
): Output | undefined {
  const result = schema.safeParse(value);
  if (!result.success) {
    res
      .status(400)
      .json({ error: result.error.issues[0]?.message ?? "Invalid request" });
    return undefined;
  }
  return result.data;
}

function error(res: Response, cause: unknown): void {
  if (cause instanceof TestScenarioNotFoundError) {
    res.status(404).json({ error: cause.message });
    return;
  }
  if (cause instanceof OrganizationError) {
    res.status(cause.status).json({ error: cause.message });
    return;
  }
  res.status(500).json({ error: "Organization operation failed" });
}

function routeId(value: string | string[] | undefined): string {
  if (!value || Array.isArray(value))
    throw new OrganizationError("Invalid route identifier", 400);
  return value;
}

export const testScenarioOrganizationController = {
  async listFolders(req: AuthenticatedRequest, res: Response) {
    const query = parse(res, organizationProjectQuery, req.query);
    if (!query) return;
    try {
      res.json(await service.listFolders(query.projectId));
    } catch (e) {
      error(res, e);
    }
  },

  async createFolder(req: AuthenticatedRequest, res: Response) {
    const body = parse(res, folderCreateBody, req.body);
    if (!body) return;
    try {
      res.status(201).json(
        await service.createFolder({
          projectId: body.projectId,
          name: body.name,
          ...(body.description !== undefined
            ? { description: body.description }
            : {}),
          ...(body.parentId !== undefined ? { parentId: body.parentId } : {}),
          ...(body.position !== undefined ? { position: body.position } : {}),
        }),
      );
    } catch (e) {
      error(res, e);
    }
  },

  async updateFolder(req: AuthenticatedRequest, res: Response) {
    const body = parse(res, folderUpdateBody, {
      ...req.body,
      projectId: req.query.projectId,
    });
    if (!body) return;
    try {
      res.json(
        await service.updateFolder({
          projectId: body.projectId,
          folderId: routeId(req.params.folderId),
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.description !== undefined
            ? { description: body.description }
            : {}),
          ...(body.parentId !== undefined ? { parentId: body.parentId } : {}),
          ...(body.position !== undefined ? { position: body.position } : {}),
        }),
      );
    } catch (e) {
      error(res, e);
    }
  },

  async deleteFolder(req: AuthenticatedRequest, res: Response) {
    const query = parse(res, folderDeleteQuery, req.query);
    if (!query) return;
    try {
      res.json(
        await service.deleteFolder({
          ...query,
          folderId: routeId(req.params.folderId),
          ...(req.user ? { updatedById: req.user.id } : {}),
        }),
      );
    } catch (e) {
      error(res, e);
    }
  },

  async restoreFolderDeletion(req: AuthenticatedRequest, res: Response) {
    const body = parse(res, folderRestoreBody, req.body);
    if (!body) return;
    try {
      res.json(
        await service.restoreFolderDeletion({
          ...body,
          ...(req.user ? { updatedById: req.user.id } : {}),
        }),
      );
    } catch (e) {
      error(res, e);
    }
  },

  async restoreScenarioFolders(req: AuthenticatedRequest, res: Response) {
    const body = parse(res, folderMoveRestoreBody, req.body);
    if (!body) return;
    try {
      res.json(
        await service.restoreScenarioFolders({
          ...body,
          ...(req.user ? { updatedById: req.user.id } : {}),
        }),
      );
    } catch (e) {
      error(res, e);
    }
  },

  async listSuites(req: AuthenticatedRequest, res: Response) {
    const query = parse(res, organizationProjectQuery, req.query);
    if (!query) return;
    try {
      res.json(await service.listSuites(query.projectId));
    } catch (e) {
      error(res, e);
    }
  },

  async getSuite(req: AuthenticatedRequest, res: Response) {
    const query = parse(res, organizationProjectQuery, req.query);
    if (!query) return;
    try {
      res.json(
        await service.getSuite(query.projectId, routeId(req.params.suiteId)),
      );
    } catch (e) {
      error(res, e);
    }
  },

  async createSuite(req: AuthenticatedRequest, res: Response) {
    const body = parse(res, suiteCreateBody, req.body);
    if (!body) return;
    try {
      res.status(201).json(
        await service.createSuite({
          projectId: body.projectId,
          name: body.name,
          ...(body.description !== undefined
            ? { description: body.description }
            : {}),
          ...(body.purpose !== undefined ? { purpose: body.purpose } : {}),
          ...(body.release !== undefined ? { release: body.release } : {}),
        }),
      );
    } catch (e) {
      error(res, e);
    }
  },

  async updateSuite(req: AuthenticatedRequest, res: Response) {
    const body = parse(res, suiteUpdateBody, {
      ...req.body,
      projectId: req.query.projectId,
    });
    if (!body) return;
    try {
      res.json(
        await service.updateSuite({
          projectId: body.projectId,
          suiteId: routeId(req.params.suiteId),
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.description !== undefined
            ? { description: body.description }
            : {}),
          ...(body.purpose !== undefined ? { purpose: body.purpose } : {}),
          ...(body.release !== undefined ? { release: body.release } : {}),
        }),
      );
    } catch (e) {
      error(res, e);
    }
  },

  async deleteSuite(req: AuthenticatedRequest, res: Response) {
    const query = parse(res, organizationProjectQuery, req.query);
    if (!query) return;
    try {
      res.json(
        await service.deleteSuite(
          query.projectId,
          routeId(req.params.suiteId),
          req.user?.id,
        ),
      );
    } catch (e) {
      error(res, e);
    }
  },

  async addMembers(req: AuthenticatedRequest, res: Response) {
    const body = parse(res, memberBody, req.body);
    if (!body) return;
    try {
      res.json(
        await service.mutateMembers({
          ...body,
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
    const body = parse(res, memberBody, req.body);
    if (!body) return;
    try {
      res.json(
        await service.mutateMembers({
          ...body,
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
    const body = parse(res, suiteMembershipChangeBody, req.body);
    if (!body) return;
    try {
      res.json(
        await service.changeSuiteMembership({
          ...body,
          suiteId: routeId(req.params.suiteId),
          ...(req.user ? { updatedById: req.user.id } : {}),
        }),
      );
    } catch (e) {
      error(res, e);
    }
  },

  async restoreSuiteMembership(req: AuthenticatedRequest, res: Response) {
    const body = parse(res, suiteMembershipRestoreBody, req.body);
    if (!body) return;
    try {
      res.json(
        await service.restoreSuiteMembership({
          ...body,
          suiteId: routeId(req.params.suiteId),
          ...(req.user ? { updatedById: req.user.id } : {}),
        }),
      );
    } catch (e) {
      error(res, e);
    }
  },

  async moveSuiteMembership(req: AuthenticatedRequest, res: Response) {
    const body = parse(res, suiteMoveBody, req.body);
    if (!body) return;
    try {
      res.json(
        await service.moveSuiteMembership({
          ...body,
          ...(req.user ? { updatedById: req.user.id } : {}),
        }),
      );
    } catch (e) {
      error(res, e);
    }
  },

  async restoreSuiteMove(req: AuthenticatedRequest, res: Response) {
    const body = parse(res, suiteMoveRestoreBody, req.body);
    if (!body) return;
    try {
      res.json(
        await service.restoreSuiteMove({
          ...body,
          ...(req.user ? { updatedById: req.user.id } : {}),
        }),
      );
    } catch (e) {
      error(res, e);
    }
  },

  async orderMembers(req: AuthenticatedRequest, res: Response) {
    const body = parse(res, memberOrderBody, req.body);
    if (!body) return;
    try {
      res.json(
        await service.reorderMembers({
          projectId: body.projectId,
          suiteId: routeId(req.params.suiteId),
          scenarioIds: body.scenarioIds,
          ...(body.expectedMembershipRevision !== undefined
            ? { expectedMembershipRevision: body.expectedMembershipRevision }
            : {}),
          ...(body.expectedScenarioIds !== undefined
            ? { expectedScenarioIds: body.expectedScenarioIds }
            : {}),
        }),
      );
    } catch (e) {
      error(res, e);
    }
  },

  async bulkFolder(req: AuthenticatedRequest, res: Response) {
    const body = parse(res, bulkFolderBody, req.body);
    if (!body) return;
    try {
      res.json(
        await service.moveScenarios({
          ...body,
          ...(req.user ? { updatedById: req.user.id } : {}),
        }),
      );
    } catch (e) {
      error(res, e);
    }
  },
};
