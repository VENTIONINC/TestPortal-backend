// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
const listPage = jest.fn();
jest.mock("@/models/specModel", () => ({ specModel: { listPage } }));
import { specService } from "@/services/specService";

describe("listSpecs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listPage.mockResolvedValue({ specs: [], total: 0 } as never);
  });

  it("lists independent Specs with defaults and normalized legacy JSON", async () => {
    const spec = {
      id: "unused",
      projectId: "p",
      key: "K",
      title: "T",
      file: "f",
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: '["smoke"]',
      annotations: '[{"type":"x"}]',
    };
    listPage.mockResolvedValue({ specs: [spec], total: 1 } as never);

    const result = await specService.listSpecs({
      projectId: "p",
      search: "  ",
    });

    expect(result).toEqual({
      projectId: "p",
      specs: [{ ...spec, tags: ["smoke"], annotations: [{ type: "x" }] }],
      total: 1,
      page: 1,
      limit: 30,
      totalPages: 1,
    });
    expect(listPage).toHaveBeenCalledWith({ projectId: "p" }, 1, 30);
  });

  it("preserves totals for empty and beyond-last pages", async () => {
    listPage.mockResolvedValueOnce({ specs: [], total: 3 } as never);
    await expect(
      specService.listSpecs({
        projectId: "p",
        search: "  test ",
        page: 3,
        limit: 2,
      }),
    ).resolves.toEqual({
      projectId: "p",
      specs: [],
      total: 3,
      page: 3,
      limit: 2,
      totalPages: 2,
    });
    expect(listPage).toHaveBeenCalledWith(
      { projectId: "p", search: "test" },
      3,
      2,
    );

    expect((await specService.listSpecs({ projectId: "p" })).totalPages).toBe(
      0,
    );
  });

  it("returns each model Spec once without consulting execution Results", async () => {
    const spec = {
      id: "with-results",
      projectId: "p",
      key: "K",
      title: "T",
      file: "f",
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      annotations: [],
    };
    listPage.mockResolvedValue({ specs: [spec], total: 1 } as never);

    const result = await specService.listSpecs({ projectId: "p" });

    expect(result.specs).toEqual([spec]);
    expect(result.total).toBe(1);
    expect(listPage).toHaveBeenCalledTimes(1);
  });

  it.each([
    { page: 0 },
    { page: 1.5 },
    { limit: 0 },
    { limit: 101 },
    { limit: 1.5 },
  ])("rejects invalid pagination %o", async (pagination) => {
    await expect(
      specService.listSpecs({ projectId: "p", ...pagination }),
    ).rejects.toThrow();
    expect(listPage).not.toHaveBeenCalled();
  });
});
