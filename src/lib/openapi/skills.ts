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
    downloadUrl: z.string(),
  })
  .openapi("SkillMetadata");

const SkillDetailResponseSchema = z
  .object({
    metadata: SkillMetadataSchema,
    content: z.string(),
  })
  .openapi("SkillDetailResponse");

const SkillsListResponseSchema = z
  .object({
    skills: z.array(SkillMetadataSchema),
  })
  .openapi("SkillsListResponse");

const SkillMarkdownDownloadSchema = z
  .string()
  .openapi("SkillMarkdownDownload", {
    description: "Raw SKILL.md Markdown artifact content.",
  });

const SkillArchiveDownloadSchema = z
  .string()
  .openapi("SkillArchiveDownload", {
    format: "binary",
    description: "Zip archive containing the skill folder and bundled files.",
  });

const SkillPackageUploadSchema = z
  .object({
    package: z.string().openapi({
      format: "binary",
      description: "Zip archive containing SKILL.md and optional package resources.",
    }),
    title: z.string().min(1).openapi({
      description: "Display title used in the shared skills catalog.",
      example: "Deployment Runbook Assistant",
    }),
    category: z.string().min(1).openapi({
      description: "Catalog category for the custom skill.",
      example: "operations",
    }),
  })
  .openapi("SkillPackageUpload");

export function registerSkillRoutes(registry: OpenAPIRegistry) {
  registry.register("SkillMetadata", SkillMetadataSchema);
  registry.register("SkillDetailResponse", SkillDetailResponseSchema);
  registry.register("SkillsListResponse", SkillsListResponseSchema);
  registry.register("SkillMarkdownDownload", SkillMarkdownDownloadSchema);
  registry.register("SkillArchiveDownload", SkillArchiveDownloadSchema);
  registry.register("SkillPackageUpload", SkillPackageUploadSchema);

  registry.registerPath({
    method: "post",
    path: "/api/v2/skills",
    description:
      "Creates a shared custom skill from a zip package and required catalog metadata (requires authentication)",
    request: {
      body: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: SkillPackageUploadSchema,
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    responses: {
      201: {
        description: "Custom skill created",
        content: {
          "application/json": { schema: SkillMetadataSchema },
        },
      },
      400: {
        description: "Missing metadata or invalid, malformed, or unsafe package",
        content: {
          "application/json": { schema: ErrorResponseSchema },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": { schema: ErrorResponseSchema },
        },
      },
      409: {
        description: "A persisted skill already uses the package frontmatter name",
        content: {
          "application/json": { schema: ErrorResponseSchema },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": { schema: ErrorResponseSchema },
        },
      },
    },
    tags: ["Skills"],
  });

  registry.registerPath({
    method: "put",
    path: "/api/v2/skills/{id}",
    description:
      "Replaces a custom skill package and catalog metadata while preserving its ID (requires authentication)",
    request: {
      params: SkillIdParamSchema,
      body: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: SkillPackageUploadSchema,
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Custom skill replaced",
        content: {
          "application/json": { schema: SkillMetadataSchema },
        },
      },
      400: {
        description: "Missing metadata or invalid, malformed, or unsafe package",
        content: {
          "application/json": { schema: ErrorResponseSchema },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": { schema: ErrorResponseSchema },
        },
      },
      403: {
        description: "The selected skill is read-only",
        content: {
          "application/json": { schema: ErrorResponseSchema },
        },
      },
      404: {
        description: "Skill not found for the provided ID",
        content: {
          "application/json": { schema: ErrorResponseSchema },
        },
      },
      409: {
        description: "Another persisted skill uses the replacement package name",
        content: {
          "application/json": { schema: ErrorResponseSchema },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": { schema: ErrorResponseSchema },
        },
      },
    },
    tags: ["Skills"],
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v2/skills/{id}",
    description: "Deletes a custom skill and its package files (requires authentication)",
    request: { params: SkillIdParamSchema },
    security: [{ BearerAuth: [] }],
    responses: {
      204: { description: "Custom skill deleted" },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": { schema: ErrorResponseSchema },
        },
      },
      403: {
        description: "The selected skill is read-only",
        content: {
          "application/json": { schema: ErrorResponseSchema },
        },
      },
      404: {
        description: "Skill not found for the provided ID",
        content: {
          "application/json": { schema: ErrorResponseSchema },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": { schema: ErrorResponseSchema },
        },
      },
    },
    tags: ["Skills"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v2/skills",
    description:
      "Retrieves persisted downloadable skills with metadata and ID-based artifact URLs (requires authentication)",
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
      "Retrieves metadata and Markdown content for a persisted skill by ID (requires authentication)",
    request: {
      params: SkillIdParamSchema,
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Skill metadata and Markdown content",
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
    path: "/api/v2/skills/{id}/download",
    description:
      "Downloads the canonical SKILL.md artifact for a persisted skill by ID (requires authentication)",
    request: {
      params: SkillIdParamSchema,
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Markdown skill artifact",
        headers: {
          "Content-Disposition": {
            description: "Attachment filename derived from the skill name",
            schema: {
              type: "string",
            },
          },
        },
        content: {
          "text/markdown; charset=utf-8": {
            schema: SkillMarkdownDownloadSchema,
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
      "Downloads a zip archive containing a persisted skill folder and bundled resources by ID (requires authentication)",
    request: {
      params: SkillIdParamSchema,
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Zip archive containing the skill package",
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
  SkillMarkdownDownloadSchema,
  SkillArchiveDownloadSchema,
  SkillPackageUploadSchema,
};
