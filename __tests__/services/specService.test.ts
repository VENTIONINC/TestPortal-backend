// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
const list = jest.fn();
const count = jest.fn();
jest.mock("@/models/specModel", () => ({ specModel: { list, count } }));
import { specService } from "@/services/specService";

describe("listSpecs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    list.mockResolvedValue([] as never);
    count.mockResolvedValue(0 as never);
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
    list.mockResolvedValue([spec] as never);
    count.mockResolvedValue(1 as never);
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
    expect(list).toHaveBeenCalledWith({ projectId: "p" }, 1, 30);
    expect(count).toHaveBeenCalledWith({ projectId: "p" });
  });

  it("preserves totals for empty and beyond-last pages", async () => {
    count.mockResolvedValue(3 as never);
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
    expect(list).toHaveBeenCalledWith({ projectId: "p", search: "test" }, 3, 2);
    count.mockResolvedValue(0 as never);
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
    list.mockResolvedValue([spec] as never);
    count.mockResolvedValue(1 as never);
    const result = await specService.listSpecs({ projectId: "p" });
    expect(result.specs).toEqual([spec]);
    expect(result.total).toBe(1);
    expect(list).toHaveBeenCalledTimes(1);
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
    expect(list).not.toHaveBeenCalled();
  });
});
