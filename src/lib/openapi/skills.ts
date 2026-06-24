// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";

import { ErrorResponseSchema } from "./common";
import { z } from "./zod";

const SkillNameParamSchema = z.object({
  name: z.enum([
    "developer-code-assistant",
    "definition-of-ready-assistant",
    "test-portal-assistant",
    "issue-analysis-assistant",
    "environment-performance-assistant",
    "software-documentation-assistant",
  ]),
});

const SkillMetadataSchema = z
  .object({
    name: z.string(),
    title: z.string(),
    description: z.string(),
    category: z.string(),
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

export function registerSkillRoutes(registry: OpenAPIRegistry) {
  registry.register("SkillMetadata", SkillMetadataSchema);
  registry.register("SkillDetailResponse", SkillDetailResponseSchema);
  registry.register("SkillsListResponse", SkillsListResponseSchema);
  registry.register("SkillMarkdownDownload", SkillMarkdownDownloadSchema);
  registry.register("SkillArchiveDownload", SkillArchiveDownloadSchema);

  registry.registerPath({
    method: "get",
    path: "/api/v2/skills",
    description:
      "Retrieves predefined downloadable skills with metadata (requires authentication)",
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
    path: "/api/v2/skills/{name}",
    description:
      "Retrieves metadata and Markdown content for a predefined skill (requires authentication)",
    request: {
      params: SkillNameParamSchema,
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
        description: "Skill not found",
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
    path: "/api/v2/skills/{name}/download",
    description:
      "Downloads the canonical SKILL.md artifact for a predefined skill (requires authentication)",
    request: {
      params: SkillNameParamSchema,
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
        description: "Skill not found",
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
    path: "/api/v2/skills/{name}/archive",
    description:
      "Downloads a zip archive containing a predefined skill folder and bundled resources (requires authentication)",
    request: {
      params: SkillNameParamSchema,
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
        description: "Skill not found",
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
};
