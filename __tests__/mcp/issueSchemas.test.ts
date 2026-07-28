// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import {
  createIssueSchema,
  getIssueByIdSchema,
  getIssuesSchema,
} from "@/mcp/schemas/issueSchemas";

describe("MCP issue schemas", () => {
  it("does not expose an issue-owned category write or filter", () => {
    expect(getIssuesSchema).not.toHaveProperty("category");
    expect(createIssueSchema).not.toHaveProperty("category");
  });

  it("keeps project scoping and statistics date filters", () => {
    expect(getIssuesSchema).toHaveProperty("projectId");
    expect(getIssuesSchema).toHaveProperty("statFrom");
    expect(getIssuesSchema).toHaveProperty("statTo");
    expect(getIssueByIdSchema).toHaveProperty("projectId");
  });
});
