// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";
import { ErrorResponseSchema } from "./common";

const StatusResponseSchema = z
  .object({
    status: z.string(),
    version: z.string(),
  })
  .openapi("StatusResponse");

export function registerSystemRoutes(registry: OpenAPIRegistry) {
  registry.register("StatusResponse", StatusResponseSchema);

  // V2 Status endpoint - public route
  registry.registerPath({
    method: "get",
    path: "/api/v2/status",
    description: "Checks the status of the server and its connections",
    responses: {
      200: {
        description: "Server status",
        content: {
          "application/json": {
            schema: StatusResponseSchema,
          },
        },
      },
      503: {
        description: "Service unavailable",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["System"],
  });
}

export { StatusResponseSchema };
