// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { statusHandler } from "@/routes/status";
import { executeController } from "@/test-utils/httpMocks";
import { environment } from "@/config/environment";
import pkg from "../../package.json";

describe("status route", () => {
  it("GET /v2/status returns ok", async () => {
    const res = await executeController(statusHandler, { method: "GET" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: "ok", version: environment.appVersion });
    expect(res.body.version).toBe(pkg.version);
  });
});
