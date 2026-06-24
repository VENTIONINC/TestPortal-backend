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
