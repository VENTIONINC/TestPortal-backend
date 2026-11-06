// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0


import { z } from "zod";

export const environmentValueSchema = z.string().trim().max(200).regex(/^[^\r\n]*$/, "Must be a single line").nullable().transform((value) => value || null);
export const profileNameSchema = z.string().trim().min(1).max(100).regex(/^[^\r\n]+$/, "Must be a single line");
const profileFields = {
  browser: environmentValueSchema.optional(),
  operatingSystem: environmentValueSchema.optional(),
  device: environmentValueSchema.optional(),
  apiEnvironment: environmentValueSchema.optional(),
};
export const profileCreateSchema = z.object({ name: profileNameSchema, ...profileFields }).strict();
export const profileUpdateSchema = z.object({ name: profileNameSchema.optional(), ...profileFields }).strict().refine((value) => Object.keys(value).length > 0, "At least one editable field is required");
export const profileProjectParamsSchema = z.object({ projectId: z.string().uuid() });
export const profileIdParamsSchema = profileProjectParamsSchema.extend({ profileId: z.string().uuid() });
export type ProfileCreateInput = z.infer<typeof profileCreateSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
