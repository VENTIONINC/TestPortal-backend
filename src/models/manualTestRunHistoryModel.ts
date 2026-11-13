// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { ManualTestRunScenarioResult, Prisma } from "@prisma/client";
import { dbClient } from "@/prisma/client";
import { getManualRunPeriodBounds } from "@/lib/manualTestRunPeriod";
import { manualTestRunCreationModel } from "@/models/manualTestRunCreationModel";
import type {
  ListManualTestRunsParams,
  ManualTestRunPage,
  ManualTestRunSummary,
} from "@/types/manualTestRuns";

const summarySelect = {
  id: true,
  projectId: true,
  executedById: true,
  status: true,
  startedAt: true,
  updatedAt: true,
  completedAt: true,
  title: true,
  browser: true,
  operatingSystem: true,
  device: true,
  apiEnvironment: true,
  build: true,
  deployment: true,
  executedBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.ManualTestRunSelect;

function calendarDay(date: Date | null, timeZone: string): string | null {
  if (!date) return null;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function createWhere(
  params: ListManualTestRunsParams,
  now: Date,
  timeZone: string,
): Prisma.ManualTestRunWhereInput {
  const where: Prisma.ManualTestRunWhereInput = { projectId: params.projectId };
  const and: Prisma.ManualTestRunWhereInput[] = [];
  const show = params.show ?? "in_progress";
  const period = params.period ?? "recent";
  if (show !== "all") and.push({ status: show });

  if (params.search) {
    const search = params.search.trim();
    if (search) {
      and.push({
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { build: { contains: search, mode: "insensitive" } },
          { browser: { contains: search, mode: "insensitive" } },
          {
            executedBy: {
              is: {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                ],
              },
            },
          },
        ],
      });
    }
  }

  const bounds = getManualRunPeriodBounds({
    period,
    now,
    timeZone,
    ...(params.dateFrom !== undefined ? { dateFrom: params.dateFrom } : {}),
    ...(params.dateTo !== undefined ? { dateTo: params.dateTo } : {}),
  });
  if (period === "recent") {
    and.push({
      OR: [
        { status: "in_progress" },
        {
          status: "completed",
          completedAt: { gte: bounds.completedSince!, lte: now },
        },
      ],
    });
  } else if (bounds.start && bounds.end) {
    and.push({
      OR: [
        {
          intervals: {
            some: {
              startedAt: { lt: bounds.end },
              OR: [{ endedAt: null }, { endedAt: { gt: bounds.start } }],
            },
          },
        },
        {
          status: "completed",
          completedAt: { gte: bounds.start, lt: bounds.end },
        },
      ],
    });
  }

  if (and.length) where.AND = and;
  return where;
}

export const manualTestRunHistoryModel = {
  async list(
    params: ListManualTestRunsParams,
    now = new Date(),
  ): Promise<ManualTestRunPage> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 30;
    const timeZone = params.timeZone ?? "UTC";
    // Constructing the formatter validates the IANA time-zone identifier.
    new Intl.DateTimeFormat("en-US", { timeZone });
    const where = createWhere(params, now, timeZone);

    return await dbClient.$transaction(
      async (tx) => {
        const [total, records] = await Promise.all([
          tx.manualTestRun.count({ where }),
          tx.manualTestRun.findMany({
            where,
            select: summarySelect,
            orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
            skip: (page - 1) * limit,
            take: limit,
          }),
        ]);
        const runIds = records.map(({ id }) => id);
        const grouped = runIds.length
          ? await tx.manualTestRunScenario.groupBy({
              by: ["manualTestRunId", "result"],
              where: {
                projectId: params.projectId,
                manualTestRunId: { in: runIds },
              },
              _count: { _all: true },
            })
          : [];
        const counts = new Map<
          string,
          Record<ManualTestRunScenarioResult, number>
        >();
        for (const row of grouped) {
          const aggregate = counts.get(row.manualTestRunId) ?? {
            untested: 0,
            passed: 0,
            failed: 0,
            blocked: 0,
            skipped: 0,
          };
          aggregate[row.result] = row._count._all;
          counts.set(row.manualTestRunId, aggregate);
        }

        const runs: ManualTestRunSummary[] = records.map((record) => {
          const resultCounts = counts.get(record.id) ?? {
            untested: 0,
            passed: 0,
            failed: 0,
            blocked: 0,
            skipped: 0,
          };
          return {
            ...record,
            completedDay: calendarDay(record.completedAt, timeZone),
            scenarioCount:
              resultCounts.untested +
              resultCounts.passed +
              resultCounts.failed +
              resultCounts.blocked +
              resultCounts.skipped,
            untestedCount: resultCounts.untested,
            passedCount: resultCounts.passed,
            failedCount: resultCounts.failed,
            blockedCount: resultCounts.blocked,
            skippedCount: resultCounts.skipped,
          };
        });
        return {
          runs,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  },

  async findById(projectId: string, runId: string) {
    return await manualTestRunCreationModel.findById(projectId, runId);
  },
};
