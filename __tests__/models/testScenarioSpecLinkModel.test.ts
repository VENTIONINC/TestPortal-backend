// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";

const createMock = jest.fn<() => Promise<unknown>>();
const findManyMock = jest.fn<() => Promise<unknown>>();
const countMock = jest.fn<() => Promise<unknown>>();
const deleteManyMock = jest.fn<() => Promise<unknown>>();

jest.mock("@/prisma/client", () => ({
  dbClient: {
    testScenarioSpecLink: {
      create: createMock,
      findMany: findManyMock,
      count: countMock,
      deleteMany: deleteManyMock,
    },
  },
}));

import { testScenarioSpecLinkModel } from "@/models/testScenarioSpecLinkModel";

describe("testScenarioSpecLinkModel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createMock.mockResolvedValue({ testScenarioId: "scenario-1", specId: "spec-1" });
    findManyMock.mockResolvedValue([]);
    countMock.mockResolvedValue(0);
    deleteManyMock.mockResolvedValue({ count: 1 });
  });

  it("creates one composite link and leaves duplicate enforcement to Prisma", async () => {
    await testScenarioSpecLinkModel.create({
      testScenarioId: "scenario-1",
      specId: "spec-1",
    });

    expect(createMock).toHaveBeenCalledWith({
      data: { testScenarioId: "scenario-1", specId: "spec-1" },
    });
  });

  it("lists only same-project linked Specs with deterministic ordering", async () => {
    await testScenarioSpecLinkModel.findLinkedSpecs(
      "scenario-1",
      "project-1",
      2,
      10,
    );

    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        testScenarioId: "scenario-1",
        spec: { projectId: "project-1" },
      },
      include: { spec: true },
      skip: 10,
      take: 10,
      orderBy: [
        { spec: { createdAt: "desc" } },
        { spec: { id: "desc" } },
      ],
    });
  });

  it("resolves linked Spec IDs and counts through the same project predicate", async () => {
    findManyMock.mockResolvedValueOnce([{ specId: "spec-1" }, { specId: "spec-2" }]);
    countMock.mockResolvedValue(2);

    await expect(
      testScenarioSpecLinkModel.findLinkedSpecIds("scenario-1", "project-1"),
    ).resolves.toEqual(["spec-1", "spec-2"]);
    await expect(
      testScenarioSpecLinkModel.countLinkedSpecs("scenario-1", "project-1"),
    ).resolves.toBe(2);

    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        testScenarioId: "scenario-1",
        spec: { projectId: "project-1" },
      },
      select: { specId: true },
    });
    expect(countMock).toHaveBeenCalledWith({
      where: {
        testScenarioId: "scenario-1",
        spec: { projectId: "project-1" },
      },
    });
  });

  it("lists lightweight same-project scenarios in deterministic order", async () => {
    findManyMock.mockResolvedValueOnce([
      { testScenario: { id: "scenario-new", title: "New", details: null, contentMd: "# New\n" } },
      { testScenario: { id: "scenario-old", title: "Old", details: "Details", contentMd: "# Old\n" } },
      { testScenario: { id: "scenario-new", title: "New", details: null, contentMd: "# New\n" } },
    ]);

    await expect(
      testScenarioSpecLinkModel.findLinkedTestScenarios("spec-1", "project-1"),
    ).resolves.toEqual([
      { id: "scenario-new", title: "New", details: null, contentMd: "# New\n" },
      { id: "scenario-old", title: "Old", details: "Details", contentMd: "# Old\n" },
    ]);

    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        specId: "spec-1",
        spec: { projectId: "project-1" },
        testScenario: { projectId: "project-1" },
      },
      select: {
        testScenario: {
          select: {
            id: true,
            title: true,
            details: true,
            contentMd: true,
          },
        },
      },
      orderBy: [
        { testScenario: { createdAt: "desc" } },
        { testScenario: { id: "desc" } },
      ],
    });
  });

  it("returns an empty list when the Spec has no scenario links", async () => {
    findManyMock.mockResolvedValueOnce([]);

    await expect(
      testScenarioSpecLinkModel.findLinkedTestScenarios("spec-1", "project-1"),
    ).resolves.toEqual([]);
  });

  it("deletes only the association and reports whether it existed", async () => {
    await expect(
      testScenarioSpecLinkModel.delete("scenario-1", "spec-1"),
    ).resolves.toBe(1);

    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { testScenarioId: "scenario-1", specId: "spec-1" },
    });
  });
});
