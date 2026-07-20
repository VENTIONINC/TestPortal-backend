// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import skillRoutes from "@/routes/skillRoutes";

type RouterLayer = {
  route?: {
    path: string;
  };
};

describe("skills routes", () => {
  it("exposes detail and archive routes but not the raw Markdown download route", () => {
    const paths = (skillRoutes.stack as RouterLayer[])
      .flatMap((layer) => (layer.route ? [layer.route.path] : []));

    expect(paths).toEqual(
      expect.arrayContaining(["/v2/skills", "/v2/skills/:id", "/v2/skills/:id/archive"]),
    );
    expect(paths).not.toContain("/v2/skills/:id/download");
  });
});
