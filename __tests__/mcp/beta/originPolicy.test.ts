// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import {
  isMcpBetaPath,
  parseMcpBetaAllowedOrigins,
} from "@/mcp/beta/originPolicy";

describe("MCP beta origin configuration", () => {
  it.each([
    "/api/v2/mcp-beta",
    "/api/v2/mcp-beta/",
    "/api/v2/MCP-BETA",
    "/api/v2/MCP-BETA/",
  ])("recognizes Express-compatible beta path %s", (path) => {
    expect(isMcpBetaPath(path)).toBe(true);
  });

  it("does not classify nested paths as the beta endpoint", () => {
    expect(isMcpBetaPath("/api/v2/mcp-beta/extra")).toBe(false);
  });

  it("allows an empty list and normalizes exact HTTP(S) origins", () => {
    expect(parseMcpBetaAllowedOrigins(undefined)).toEqual(new Set());
    expect(
      parseMcpBetaAllowedOrigins(" https://Example.test:443/,http://localhost:6274 "),
    ).toEqual(new Set(["https://example.test", "http://localhost:6274"]));
  });

  it.each([
    "null",
    "*",
    "https://example.test/*",
    "https://example.test/path",
    "ftp://example.test",
    "https://user:pass@example.test",
    "https://example.test,,https://other.test",
  ])("rejects malformed or unsafe configuration %s", (value) => {
    expect(() => parseMcpBetaAllowedOrigins(value)).toThrow();
  });
});
