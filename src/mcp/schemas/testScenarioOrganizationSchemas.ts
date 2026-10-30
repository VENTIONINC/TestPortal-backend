// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod/v3";

const uuid = z.string().uuid();
const name = z.string().trim().min(1).max(200);
const position = z.number().int().nonnegative();
const project = { projectId: uuid };
const folder = { ...project, folderId: uuid };
const suite = { ...project, suiteId: uuid };
const metadata = {
  description: z.string().nullable().optional(),
  purpose: z.string().nullable().optional(),
  release: z.string().nullable().optional(),
};
const ids = z
  .array(uuid)
  .min(1)
  .max(100)
  .refine(
    (values) => new Set(values).size === values.length,
    "scenarioIds must be unique",
  );

export const listOrganizationSchema = z.object(project).strict();
export const createFolderSchema = z
  .object({
    ...project,
    name,
    parentId: uuid.nullable().optional(),
    position: position.optional(),
  })
  .strict();
export const updateFolderSchema = z
  .object({
    ...folder,
    name: name.optional(),
    parentId: uuid.nullable().optional(),
    position: position.optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.name !== undefined ||
      v.parentId !== undefined ||
      v.position !== undefined,
    "At least one editable field is required",
  );
export const deleteFolderSchema = z
  .object({ ...folder, disposition: z.enum(["parent", "unfiled"]) })
  .strict();
export const moveScenariosSchema = z
  .object({ ...project, scenarioIds: ids, folderId: uuid.nullable() })
  .strict();
export const getSuiteSchema = z.object(suite).strict();
export const createSuiteSchema = z
  .object({ ...project, name, ...metadata })
  .strict();
export const updateSuiteSchema = z
  .object({ ...suite, name: name.optional(), ...metadata })
  .strict()
  .refine(
    (v) =>
      v.name !== undefined ||
      v.description !== undefined ||
      v.purpose !== undefined ||
      v.release !== undefined,
    "At least one editable field is required",
  );
export const mutateMembersSchema = z
  .object({ ...suite, scenarioIds: ids })
  .strict();
export const reorderMembersSchema = z
  .object({
    ...suite,
    scenarioIds: z
      .array(uuid)
      .refine(
        (values) => new Set(values).size === values.length,
        "scenarioIds must be unique",
      ),
  })
  .strict();
