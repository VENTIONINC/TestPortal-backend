// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod/v3";

const context = { projectId: z.string().uuid(), scenarioId: z.string().uuid() };
export const listSpecLinksSchema = z
  .object({
    ...context,
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(30),
  })
  .strict();
export const mutateSpecLinkSchema = z
  .object({ ...context, specId: z.string().uuid() })
  .strict();
export type ListSpecLinksActionInput = z.infer<typeof listSpecLinksSchema>;
export type MutateSpecLinkActionInput = z.infer<typeof mutateSpecLinkSchema>;
