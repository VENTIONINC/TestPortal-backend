// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

const uuid = z.string().uuid();
const name = z.string().trim().min(1).max(200);
export const organizationProjectQuery = z.object({ projectId: uuid });
export const folderCreateBody = z.object({ projectId: uuid, name, parentId: uuid.nullable().optional(), position: z.number().int().nonnegative().optional() }).strict();
export const folderUpdateBody = z.object({ projectId: uuid, name: name.optional(), parentId: uuid.nullable().optional(), position: z.number().int().nonnegative().optional() }).strict().refine((value) => value.name !== undefined || value.parentId !== undefined || value.position !== undefined);
export const folderDeleteQuery = z.object({ projectId: uuid, disposition: z.enum(["parent", "unfiled"]) });
export const suiteCreateBody = z.object({ projectId: uuid, name, description: z.string().nullable().optional(), purpose: z.string().nullable().optional(), release: z.string().nullable().optional() }).strict();
export const suiteUpdateBody = z.object({ projectId: uuid, name: name.optional(), description: z.string().nullable().optional(), purpose: z.string().nullable().optional(), release: z.string().nullable().optional() }).strict().refine((value) => Object.keys(value).some((key) => key !== "projectId"));
const uniqueIds = (value: { scenarioIds: string[] }) => new Set(value.scenarioIds).size === value.scenarioIds.length;
export const memberBody = z.object({ projectId: uuid, scenarioIds: z.array(uuid).min(1).max(100) }).strict().refine(uniqueIds, "scenarioIds must be unique");
export const bulkFolderBody = z.object({ projectId: uuid, scenarioIds: z.array(uuid).min(1).max(100), folderId: uuid.nullable() }).strict().refine(uniqueIds, "scenarioIds must be unique");
export const memberOrderBody = z.object({ projectId: uuid, scenarioIds: z.array(uuid) }).strict();
