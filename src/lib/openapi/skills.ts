// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";

import { ErrorResponseSchema } from "./common";
import { z } from "./zod";

const SkillIdParamSchema = z.object({
  id: z.string().min(1).openapi({
    description:
      "Persisted skill identifier returned by the skills catalog. Unknown or malformed values return 404.",
    example: "6f5b8b53-5128-4b05-a8bf-b1d532f3a8d9",
  }),
});

const SkillMetadataSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    title: z.string(),
    description: z.string(),
    category: z.string(),
    source: z.enum(["system", "custom"]),
    readOnly: z.boolean(),
    version: z.string().optional(),
    license: z.string().optional(),
    compatibility: z.string().optional(),
    downloadUrl: z.string().openapi({
      description:
        "URL for the complete portable ZIP skill package. This is the only supported installable download.",
    }),
  })
  .openapi("SkillMetadata");

const SkillDetailResponseSchema = z
  .object({
    metadata: SkillMetadataSchema,
    content: z.string().openapi({
      description:
        "Markdown preview/source content. It is not a complete installable artifact; use metadata.downloadUrl for the ZIP package.",
    }),
  })
  .openapi("SkillDetailResponse");

const SkillsListResponseSchema = z
  .object({
    skills: z.array(SkillMetadataSchema),
  })
  .openapi("SkillsListResponse");

const SkillArchiveDownloadSchema = z
  .string()
  .openapi("SkillArchiveDownload", {
    format: "binary",
    description:
      "Complete portable ZIP package containing the skill folder, SKILL.md, and bundled files.",
  });

export function registerSkillRoutes(registry: OpenAPIRegistry) {
  registry.register("SkillMetadata", SkillMetadataSchema);
  registry.register("SkillDetailResponse", SkillDetailResponseSchema);
  registry.register("SkillsListResponse", SkillsListResponseSchema);
  registry.register("SkillArchiveDownload", SkillArchiveDownloadSchema);

  registry.registerPath({
    method: "get",
    path: "/api/v2/skills",
    description:
      "Retrieves persisted skills with metadata and URLs for complete portable ZIP packages (requires authentication)",
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "List of available skills",
        content: {
          "application/json": {
            schema: SkillsListResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Skills"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v2/skills/{id}",
    description:
      "Retrieves metadata and Markdown preview/source content for a persisted skill by ID; the content is not an installable artifact (requires authentication)",
    request: {
      params: SkillIdParamSchema,
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Skill metadata and Markdown preview/source content",
        content: {
          "application/json": {
            schema: SkillDetailResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Skill not found for the provided ID",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Skills"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v2/skills/{id}/archive",
    description:
      "Downloads the complete portable ZIP package for a persisted skill, including SKILL.md and bundled resources (requires authentication)",
    request: {
      params: SkillIdParamSchema,
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Complete portable ZIP skill package",
        headers: {
          "Content-Disposition": {
            description: "Attachment filename derived from the skill name",
            schema: {
              type: "string",
            },
          },
        },
        content: {
          "application/zip": {
            schema: SkillArchiveDownloadSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Skill not found for the provided ID",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Skills"],
  });
}

export {
  SkillMetadataSchema,
  SkillDetailResponseSchema,
  SkillsListResponseSchema,
  SkillArchiveDownloadSchema,
};
