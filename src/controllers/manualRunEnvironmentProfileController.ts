// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0


import type { Response } from "express";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";
import { profileCreateSchema, profileIdParamsSchema, profileProjectParamsSchema, profileUpdateSchema } from "@/schemas/manualRunEnvironmentProfileSchemas";
import { manualRunEnvironmentProfileService, ProfileNotFoundError } from "@/services/manualRunEnvironmentProfileService";

function fail(res: Response, error: unknown): void {
  if (error instanceof ProfileNotFoundError) {
    res.status(404).json({ error: error.message });
  } else {
    res.status(500).json({ error: "Failed to process environment profile" });
  }
}

export const manualRunEnvironmentProfileController = {
  async list(req: AuthenticatedRequest<{ projectId: string }>, res: Response): Promise<void> {
    const params = profileProjectParamsSchema.safeParse(req.params);
    if (!params.success) { res.status(400).json({ error: "Invalid project ID" }); return; }
    if (!req.user) { res.status(401).json({ error: "Authentication required" }); return; }
    try { res.status(200).json(await manualRunEnvironmentProfileService.list(params.data.projectId)); }
    catch (error) { fail(res, error); }
  },
  async create(req: AuthenticatedRequest<{ projectId: string }>, res: Response): Promise<void> {
    const params = profileProjectParamsSchema.safeParse(req.params);
    const body = profileCreateSchema.safeParse(req.body ?? {});
    if (!params.success || !body.success) { res.status(400).json({ error: "Invalid environment profile" }); return; }
    if (!req.user) { res.status(401).json({ error: "Authentication required" }); return; }
    try { res.status(201).json(await manualRunEnvironmentProfileService.create(params.data.projectId, req.user.id, body.data)); }
    catch (error) { fail(res, error); }
  },
  async update(req: AuthenticatedRequest<{ projectId: string; profileId: string }>, res: Response): Promise<void> {
    const params = profileIdParamsSchema.safeParse(req.params);
    const body = profileUpdateSchema.safeParse(req.body ?? {});
    if (!params.success || !body.success) { res.status(400).json({ error: "Invalid environment profile" }); return; }
    if (!req.user) { res.status(401).json({ error: "Authentication required" }); return; }
    try { res.status(200).json(await manualRunEnvironmentProfileService.update(params.data.projectId, params.data.profileId, body.data)); }
    catch (error) { fail(res, error); }
  },
  async remove(req: AuthenticatedRequest<{ projectId: string; profileId: string }>, res: Response): Promise<void> {
    const params = profileIdParamsSchema.safeParse(req.params);
    if (!params.success) { res.status(400).json({ error: "Invalid environment profile ID" }); return; }
    if (!req.user) { res.status(401).json({ error: "Authentication required" }); return; }
    try { await manualRunEnvironmentProfileService.remove(params.data.projectId, params.data.profileId); res.status(204).send(); }
    catch (error) { fail(res, error); }
  },
};
