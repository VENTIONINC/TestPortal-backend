// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import { OrganizationError, testScenarioOrganizationService as service } from "@/services/testScenarioOrganizationService";
import { bulkFolderBody, folderCreateBody, folderDeleteQuery, folderUpdateBody, memberBody, memberOrderBody, organizationProjectQuery, suiteCreateBody, suiteUpdateBody } from "@/schemas/testScenarioOrganizationSchemas";

function parse(res: Response, schema: ZodTypeAny, value: unknown): unknown | undefined {
  const result = schema.safeParse(value);
  if (!result.success) { res.status(400).json({ error: result.error.issues[0]?.message ?? "Invalid request" }); return undefined; }
  return result.data;
}
function error(res: Response, cause: unknown): void {
  if (cause instanceof OrganizationError) { res.status(cause.status).json({ error: cause.message }); return; }
  res.status(500).json({ error: "Organization operation failed" });
}
type Body = { projectId: string; [key: string]: unknown };
function routeId(value: string | string[] | undefined): string {
  if (!value || Array.isArray(value)) throw new OrganizationError("Invalid route identifier", 400);
  return value;
}

export const testScenarioOrganizationController = {
  async listFolders(req: Request, res: Response) { const q = parse(res, organizationProjectQuery, req.query); if (!q) return; try { res.json(await service.listFolders((q as { projectId: string }).projectId)); } catch (e) { error(res, e); } },
  async createFolder(req: Request, res: Response) { const b = parse(res, folderCreateBody, req.body); if (!b) return; try { res.status(201).json(await service.createFolder(b as Body & { name: string; parentId?: string | null; position?: number })); } catch (e) { error(res, e); } },
  async updateFolder(req: Request, res: Response) { const b = parse(res, folderUpdateBody, { ...req.body, projectId: req.query.projectId }); if (!b) return; try { res.json(await service.updateFolder({ ...(b as Body & { name?: string; parentId?: string | null; position?: number }), folderId: routeId(req.params.folderId) })); } catch (e) { error(res, e); } },
  async deleteFolder(req: Request, res: Response) { const q = parse(res, folderDeleteQuery, req.query); if (!q) return; try { res.json(await service.deleteFolder({ ...(q as { projectId: string; disposition: "parent" | "unfiled" }), folderId: routeId(req.params.folderId) })); } catch (e) { error(res, e); } },
  async listSuites(req: Request, res: Response) { const q = parse(res, organizationProjectQuery, req.query); if (!q) return; try { res.json(await service.listSuites((q as { projectId: string }).projectId)); } catch (e) { error(res, e); } },
  async getSuite(req: Request, res: Response) { const q = parse(res, organizationProjectQuery, req.query); if (!q) return; try { res.json(await service.getSuite((q as { projectId: string }).projectId, routeId(req.params.suiteId))); } catch (e) { error(res, e); } },
  async createSuite(req: Request, res: Response) { const b = parse(res, suiteCreateBody, req.body); if (!b) return; try { res.status(201).json(await service.createSuite(b as Body & { name: string; description?: string | null; purpose?: string | null; release?: string | null })); } catch (e) { error(res, e); } },
  async updateSuite(req: Request, res: Response) { const b = parse(res, suiteUpdateBody, { ...req.body, projectId: req.query.projectId }); if (!b) return; try { res.json(await service.updateSuite({ ...(b as Body & { name?: string; description?: string | null; purpose?: string | null; release?: string | null }), suiteId: routeId(req.params.suiteId) })); } catch (e) { error(res, e); } },
  async deleteSuite(req: Request, res: Response) { const q = parse(res, organizationProjectQuery, req.query); if (!q) return; try { res.json(await service.deleteSuite((q as { projectId: string }).projectId, routeId(req.params.suiteId))); } catch (e) { error(res, e); } },
  async addMembers(req: Request, res: Response) { const b = parse(res, memberBody, req.body); if (!b) return; try { res.json(await service.mutateMembers({ ...(b as { projectId: string; scenarioIds: string[] }), suiteId: routeId(req.params.suiteId), operation: "add" })); } catch (e) { error(res, e); } },
  async removeMembers(req: Request, res: Response) { const b = parse(res, memberBody, req.body); if (!b) return; try { res.json(await service.mutateMembers({ ...(b as { projectId: string; scenarioIds: string[] }), suiteId: routeId(req.params.suiteId), operation: "remove" })); } catch (e) { error(res, e); } },
  async orderMembers(req: Request, res: Response) { const b = parse(res, memberOrderBody, req.body); if (!b) return; try { res.json(await service.reorderMembers({ ...(b as { projectId: string; scenarioIds: string[] }), suiteId: routeId(req.params.suiteId) })); } catch (e) { error(res, e); } },
  async bulkFolder(req: Request, res: Response) { const b = parse(res, bulkFolderBody, req.body); if (!b) return; try { res.json(await service.moveScenarios(b as { projectId: string; scenarioIds: string[]; folderId: string | null })); } catch (e) { error(res, e); } },
};
