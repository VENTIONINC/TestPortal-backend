// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0


import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { ErrorResponseSchema } from "./common";
import { z } from "./zod";

const value = z.string().trim().max(200).regex(/^[^\r\n]*$/).nullable();
const fields = { browser: value, operatingSystem: value, device: value, apiEnvironment: value };
const inputFields = { browser: value.optional(), operatingSystem: value.optional(), device: value.optional(), apiEnvironment: value.optional() };
const ProfileSchema = z.object({ id: z.string().uuid(), projectId: z.string().uuid(), ownerId: z.string().uuid(), name: z.string(), ...fields, createdAt: z.string(), updatedAt: z.string() }).strict().openapi("ManualRunEnvironmentProfile");
const CreateSchema = z.object({ name: z.string().trim().min(1).max(100).regex(/^[^\r\n]+$/), ...inputFields }).strict().openapi("ManualRunEnvironmentProfileCreateRequest");
const UpdateSchema = z.object({ name: z.string().trim().min(1).max(100).regex(/^[^\r\n]+$/).optional(), ...inputFields }).strict().openapi("ManualRunEnvironmentProfileUpdateRequest");
const projectParams = z.object({ projectId: z.string().uuid() });
const profileParams = projectParams.extend({ profileId: z.string().uuid() });
const error = (description: string) => ({ description, content: { "application/json": { schema: ErrorResponseSchema } } });
const errors = { 400: error("Invalid request"), 401: error("Unauthorized"), 403: error("Forbidden"), 404: error("Project or profile not found in user scope"), 500: error("Internal server error") };

export function registerManualRunEnvironmentProfileRoutes(registry: OpenAPIRegistry): void {
  registry.register("ManualRunEnvironmentProfile", ProfileSchema);
  registry.register("ManualRunEnvironmentProfileCreateRequest", CreateSchema);
  registry.register("ManualRunEnvironmentProfileUpdateRequest", UpdateSchema);
  const path = "/api/v2/projects/{projectId}/manual-run-environment-profiles";
  const itemPath = `${path}/{profileId}`;
  registry.registerPath({ method: "get", path, request: { params: projectParams }, security: [{ BearerAuth: [] }], responses: { 200: { description: "Owned profiles in the project", content: { "application/json": { schema: z.array(ProfileSchema) } } }, ...errors }, tags: ["Manual Run Environment Profiles"] });
  registry.registerPath({ method: "post", path, request: { params: projectParams, body: { required: true, content: { "application/json": { schema: CreateSchema } } } }, security: [{ BearerAuth: [] }], responses: { 201: { description: "Created profile", content: { "application/json": { schema: ProfileSchema } } }, ...errors }, tags: ["Manual Run Environment Profiles"] });
  registry.registerPath({ method: "patch", path: itemPath, request: { params: profileParams, body: { required: true, content: { "application/json": { schema: UpdateSchema } } } }, security: [{ BearerAuth: [] }], responses: { 200: { description: "Updated profile", content: { "application/json": { schema: ProfileSchema } } }, ...errors }, tags: ["Manual Run Environment Profiles"] });
  registry.registerPath({ method: "delete", path: itemPath, request: { params: profileParams }, security: [{ BearerAuth: [] }], responses: { 204: { description: "Deleted profile" }, ...errors }, tags: ["Manual Run Environment Profiles"] });
}
