// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { resultErrorModel } from "@/models/resultErrorModel";
import { dbClient } from "@/prisma/client";

jest.mock("@/prisma/client", () => ({
  dbClient: {
    resultError: {
      findFirst: jest.fn(),
    },
  },
}));

describe("resultErrorModel modal context", () => {
  it("queries context through both project-owned result relations", async () => {
    const findModalContext = Reflect.get(resultErrorModel, "findModalContext");
    expect(findModalContext).toEqual(expect.any(Function));
    if (typeof findModalContext !== "function") return;

    (dbClient.resultError.findFirst as jest.Mock).mockResolvedValue(null);
    await findModalContext.call(resultErrorModel, "error-1", "project-1");

    expect(dbClient.resultError.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "error-1",
          result: {
            execution: { projectId: "project-1" },
            spec: { projectId: "project-1" },
          },
        },
        select: expect.objectContaining({
          id: true,
          rawLogs: true,
          sourceSnippet: true,
          generatedTestCase: true,
          result: expect.any(Object),
          assumptions: expect.any(Object),
        }),
      }),
    );
  });
});
