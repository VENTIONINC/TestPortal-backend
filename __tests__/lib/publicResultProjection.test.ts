// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import express from "express";
import request from "supertest";
import { createSuccessResponse } from "@/mcp/helpers/mcpHelpers";
import { publicJsonReplacer } from "@/lib/jsonPayloads";

const privateResultPayload = {
  id: "result-1",
  analysisMetadata: { request: "private" },
  analysisLastError: { credential: "private" },
  errors: [
    {
      id: "error-1",
      result: {
        id: "nested-result-1",
        analysisMetadata: { nestedRequest: "private" },
        analysisLastError: { nestedBody: "private" },
      },
    },
  ],
};

describe("public result projection", () => {
  it("removes internal metadata recursively from REST JSON responses", async () => {
    const app = express();
    app.set("json replacer", publicJsonReplacer);
    app.get("/results", (_req, res) => res.json(privateResultPayload));

    const response = await request(app).get("/results").expect(200);

    expect(response.body).toEqual({
      id: "result-1",
      errors: [{ id: "error-1", result: { id: "nested-result-1" } }],
    });
    expect(JSON.stringify(response.body)).not.toMatch(
      /analysisMetadata|analysisLastError|private/,
    );
  });

  it("removes internal metadata recursively from MCP text responses", () => {
    const response = createSuccessResponse(privateResultPayload);
    const content = response.content[0];
    if (!content || content.type !== "text") {
      throw new Error("Expected a text MCP response");
    }

    const payload = JSON.parse(content.text) as Record<string, unknown>;
    expect(payload).toEqual({
      id: "result-1",
      errors: [{ id: "error-1", result: { id: "nested-result-1" } }],
    });
    expect(content.text).not.toMatch(
      /analysisMetadata|analysisLastError|private/,
    );
  });
});
