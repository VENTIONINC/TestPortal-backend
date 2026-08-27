// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { ZodTypeAny } from "zod/v3";
import {
  createIssueSchema,
  getIssueByIdSchema,
  getIssuesSchema,
} from "@/mcp/schemas/issueSchemas";

describe("MCP issue schemas", () => {
  it("requires an exact lowercase category on create and allows it as a filter", () => {
    const categories = ["bug", "infra", "performance", "script", "other"];
    const filterCategory = getIssuesSchema.category as ZodTypeAny;
    const createCategory = createIssueSchema.category as ZodTypeAny;

    expect(filterCategory.safeParse("infra").success).toBe(true);
    expect(filterCategory.safeParse("Infra").success).toBe(false);
    expect(createCategory.safeParse(undefined).success).toBe(false);
    expect(createCategory.safeParse("Bug").success).toBe(false);
    for (const category of categories) {
      expect(createCategory.safeParse(category).success).toBe(true);
    }
  });

  it("keeps project scoping and statistics date filters", () => {
    expect(getIssuesSchema).toHaveProperty("projectId");
    expect(getIssuesSchema).toHaveProperty("statFrom");
    expect(getIssuesSchema).toHaveProperty("statTo");
    expect(getIssueByIdSchema).toHaveProperty("projectId");
  });
});
