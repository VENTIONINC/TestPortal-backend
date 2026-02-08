import { z } from "zod";
import type { MCPToolSchema } from "@/types";

/**
 * Schema for listing projects
 */
export const getProjectsSchema: MCPToolSchema = {
  isActive: z.boolean().optional(),
  name: z.string().optional(),
};

/**
 * Schema for getting a project by ID
 */
export const getProjectByIdSchema: MCPToolSchema = {
  projectId: z.string(),
};

/**
 * Schema for creating a project
 */
export const createProjectSchema: MCPToolSchema = {
  name: z.string(),
  description: z.string().optional(),
};

/**
 * Schema for updating a project
 */
export const updateProjectSchema: MCPToolSchema = {
  projectId: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
};

/**
 * Schema for deleting a project
 */
export const deleteProjectSchema: MCPToolSchema = {
  projectId: z.string(),
};
