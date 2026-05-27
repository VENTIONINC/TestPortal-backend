// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";

export const ErrorResponseSchema = z
  .object({
    error: z.string(),
  })
  .openapi("ErrorResponse");

export const SuccessResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi("SuccessResponse");

export function registerCommonSchemas(registry: OpenAPIRegistry) {
  registry.register("ErrorResponse", ErrorResponseSchema);
  registry.register("SuccessResponse", SuccessResponseSchema);
}
