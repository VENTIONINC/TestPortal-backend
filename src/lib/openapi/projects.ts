import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";
import { ErrorResponseSchema } from "./common";

const ProjectSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    isActive: z.boolean(),
    ownerId: z.string().uuid(),
    createdAt: z.string(),
    updatedAt: z.string(),
    _count: z
      .object({
        executions: z.number(),
        specs: z.number(),
        issues: z.number(),
      })
      .optional(),
  })
  .openapi("Project");

const CreateProjectRequestSchema = z
  .object({
    name: z.string(),
    description: z.string().optional(),
  })
  .openapi("CreateProjectRequest");

const UpdateProjectRequestSchema = z
  .object({
    name: z.string().optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
  })
  .openapi("UpdateProjectRequest");

export function registerProjectRoutes(registry: OpenAPIRegistry) {
  registry.register("Project", ProjectSchema);
  registry.register("CreateProjectRequest", CreateProjectRequestSchema);
  registry.register("UpdateProjectRequest", UpdateProjectRequestSchema);

  registry.registerPath({
    method: "get",
    path: "/api/v2/projects",
    description:
      "Retrieves all projects for the authenticated user (requires authentication)",
    request: {
      query: z.object({
        ownerId: z.string().uuid().optional(),
        isActive: z.boolean().optional(),
        name: z.string().optional(),
      }),
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "List of projects",
        content: {
          "application/json": {
            schema: z.array(ProjectSchema),
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
    tags: ["Projects"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v2/projects/{id}",
    description: "Retrieves a specific project by ID (requires authentication)",
    request: {
      params: z.object({
        id: z.string().uuid(),
      }),
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Project details",
        content: {
          "application/json": {
            schema: ProjectSchema,
          },
        },
      },
      400: {
        description: "Bad request - invalid project ID",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
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
        description: "Project not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Projects"],
  });

  registry.registerPath({
    method: "post",
    path: "/api/v2/projects",
    description: "Creates a new project (requires authentication)",
    request: {
      body: {
        content: {
          "application/json": {
            schema: CreateProjectRequestSchema,
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    responses: {
      201: {
        description: "Project created successfully",
        content: {
          "application/json": {
            schema: ProjectSchema,
          },
        },
      },
      400: {
        description: "Bad request - validation errors or name already exists",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
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
    },
    tags: ["Projects"],
  });

  registry.registerPath({
    method: "put",
    path: "/api/v2/projects/{id}",
    description: "Updates an existing project (requires authentication)",
    request: {
      params: z.object({
        id: z.string().uuid(),
      }),
      body: {
        content: {
          "application/json": {
            schema: UpdateProjectRequestSchema,
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Project updated successfully",
        content: {
          "application/json": {
            schema: ProjectSchema,
          },
        },
      },
      400: {
        description: "Bad request - validation errors or name already exists",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
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
        description: "Project not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Projects"],
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v2/projects/{id}",
    description:
      "Deletes a project by ID (requires authentication). Also deletes all associated executions, specs, and results (cascade delete).",
    request: {
      params: z.object({
        id: z.string().uuid(),
      }),
    },
    security: [{ BearerAuth: [] }],
    responses: {
      204: {
        description: "Project and all associated data deleted successfully",
      },
      400: {
        description: "Bad request - invalid project ID",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
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
        description: "Project not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Projects"],
  });
}

export {
  ProjectSchema,
  CreateProjectRequestSchema,
  UpdateProjectRequestSchema,
};
