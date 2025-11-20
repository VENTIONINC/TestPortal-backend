import { statusHandler } from "@/routes/status";
import { executeController } from "@/test-utils/httpMocks";

describe("status route", () => {
  it("GET /v2/status returns ok", async () => {
    const res = await executeController(statusHandler, { method: "GET" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
