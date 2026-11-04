// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { generateOpenAPISpec } from "@/lib/openapi";

describe("active user directory OpenAPI contract", () => {
  it("documents token lifecycle without changing the endpoint response contracts", () => {
    const spec = generateOpenAPISpec();
    const token = spec.paths?.["/api/v2/users/{userId}/mcp-token"];
    expect(token?.post?.description).toContain("active user");
    expect(token?.post?.description).toContain("invalidating");
    expect(token?.delete?.description).toContain("existing sessions");
    expect(token?.post?.responses?.["201"]).toBeDefined();
    expect(token?.delete?.responses?.["200"]).toBeDefined();
    expect(spec.paths?.["/api/v2/admin/users/{userId}/suspend"]?.post?.description).toContain("revokes");
    expect(spec.paths?.["/api/v2/admin/users/{userId}/restore"]?.post?.description).toContain("newly generated token");
  });
  it("documents a safe authenticated general directory independent from admin listing", () => {
    const spec = generateOpenAPISpec();
    const operation = spec.paths?.["/api/v2/users"]?.get;
    expect(operation?.security).toEqual([{ BearerAuth: [] }]);
    expect(operation?.description).toContain("active users");

    const schemas = spec.components?.schemas ?? {};
    const directory = schemas.ActiveUserDirectoryEntry as {
      properties?: Record<string, unknown>;
      additionalProperties?: boolean;
    };
    expect(Object.keys(directory.properties ?? {}).sort()).toEqual([
      "email",
      "id",
      "name",
    ]);
    expect(directory.additionalProperties).toBe(false);
    expect(spec.paths?.["/api/v2/admin/users"]?.get).toBeDefined();
  });
});
