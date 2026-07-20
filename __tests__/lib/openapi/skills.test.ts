// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { generateOpenAPISpec } from "@/lib/openapi";

describe("skills OpenAPI contract", () => {
  it("documents archive downloads and omits the raw Markdown download route", () => {
    const spec = generateOpenAPISpec();
    const paths = spec.paths ?? {};
    const archivePath = paths["/api/v2/skills/{id}/archive"];
    const detailPath = paths["/api/v2/skills/{id}"];

    expect(paths["/api/v2/skills/{id}/download"]).toBeUndefined();
    expect(archivePath?.get?.description).toContain("complete portable ZIP");
    expect(
      archivePath?.get?.responses?.["200"]?.content?.["application/zip"],
    ).toBeDefined();
    expect(detailPath?.get?.description).toContain("preview/source content");
  });
});
