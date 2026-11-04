// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod/v3";
import type { MCPToolSchema } from "@/types";

/**
 * Schema for getting a specific spec by ID
 */
export const getSpecByIdSchema: MCPToolSchema = {
  specId: z.string(),
  projectId: z.string(),
};

export const listSpecsSchema = z
  .object({
    projectId: z.string().uuid(),
    search: z.string().optional(),
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(30),
  })
  .strict();
export type ListSpecsActionInput = z.infer<typeof listSpecsSchema>;
