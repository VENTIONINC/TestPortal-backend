// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod/v3";
import type { MCPToolSchema } from "@/types";

const uuid = () => z.string().uuid();
const name = z.string().trim().min(1).max(100).regex(/^[^\r\n]+$/);
const environment = z.string().trim().max(200).regex(/^[^\r\n]*$/).nullable().transform((value) => value || null);
const fields = { browser: environment.optional(), operatingSystem: environment.optional(), device: environment.optional(), apiEnvironment: environment.optional() };
export const listProfileSchema = z.object({ projectId: uuid() }).strict() satisfies MCPToolSchema;
export const createProfileSchema = z.object({ projectId: uuid(), name, ...fields }).strict() satisfies MCPToolSchema;
export const updateProfileSchema = z.object({ projectId: uuid(), profileId: uuid(), name: name.optional(), ...fields }).strict().refine(({ name, browser, operatingSystem, device, apiEnvironment }) =>
  [name, browser, operatingSystem, device, apiEnvironment].some((value) => value !== undefined), "At least one editable field is required") satisfies MCPToolSchema;
export const deleteProfileSchema = z.object({ projectId: uuid(), profileId: uuid() }).strict() satisfies MCPToolSchema;
export type ListProfileInput = z.infer<typeof listProfileSchema>;
export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type DeleteProfileInput = z.infer<typeof deleteProfileSchema>;

