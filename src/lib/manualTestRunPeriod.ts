// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { ManualTestRunPeriod } from "@/types/manualTestRuns";

export interface ManualRunPeriodInput {
  period: ManualTestRunPeriod;
  now: Date;
  timeZone: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ManualRunPeriodBounds {
  start: Date | null;
  end: Date | null;
  completedSince: Date | null;
}

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

function calendarDate(date: Date, timeZone: string): CalendarDate {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map(({ type, value }) => [type, value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

function shiftDate(date: CalendarDate, days: number): CalendarDate {
  const shifted = new Date(
    Date.UTC(date.year, date.month - 1, date.day + days),
  );
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function localDateTimeToUtc(date: CalendarDate, timeZone: string): Date {
  const target = Date.UTC(date.year, date.month - 1, date.day);
  let guess = target;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(guess))
        .map(({ type, value }) => [type, value]),
    );
    const localAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    const correction = localAsUtc - target;
    if (correction === 0) return new Date(guess);
    guess -= correction;
  }
  return new Date(guess);
}

function parseDate(value: string | undefined, name: string): CalendarDate {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${name} must be a date in YYYY-MM-DD format`);
  }
  const components = value.split("-");
  const year = Number(components[0]);
  const month = Number(components[1]);
  const day = Number(components[2]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`${name} must be a valid calendar date`);
  }
  return { year, month, day };
}

function firstOfMonth(date: CalendarDate, monthOffset = 0): CalendarDate {
  const shifted = new Date(
    Date.UTC(date.year, date.month - 1 + monthOffset, 1),
  );
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: 1,
  };
}

export function getManualRunPeriodBounds(
  input: ManualRunPeriodInput,
): ManualRunPeriodBounds {
  const { period, now, timeZone } = input;
  if (Number.isNaN(now.getTime())) throw new Error("now must be a valid date");
  const today = calendarDate(now, timeZone);

  if (period === "recent") {
    return {
      start: null,
      end: null,
      completedSince: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    };
  }
  if (period === "any_time") {
    return { start: null, end: null, completedSince: null };
  }

  let startDate: CalendarDate;
  let endDate: CalendarDate;
  switch (period) {
    case "today":
      startDate = today;
      endDate = shiftDate(today, 1);
      break;
    case "yesterday":
      startDate = shiftDate(today, -1);
      endDate = today;
      break;
    case "last_7_days":
      startDate = shiftDate(today, -6);
      endDate = shiftDate(today, 1);
      break;
    case "last_30_days":
      startDate = shiftDate(today, -29);
      endDate = shiftDate(today, 1);
      break;
    case "this_month":
      startDate = firstOfMonth(today);
      endDate = firstOfMonth(today, 1);
      break;
    case "last_month":
      startDate = firstOfMonth(today, -1);
      endDate = firstOfMonth(today);
      break;
    case "custom": {
      startDate = parseDate(input.dateFrom, "dateFrom");
      const inclusiveEnd = parseDate(input.dateTo, "dateTo");
      const startValue = Date.UTC(
        startDate.year,
        startDate.month - 1,
        startDate.day,
      );
      const endValue = Date.UTC(
        inclusiveEnd.year,
        inclusiveEnd.month - 1,
        inclusiveEnd.day,
      );
      if (startValue > endValue)
        throw new Error("dateFrom must not be after dateTo");
      endDate = shiftDate(inclusiveEnd, 1);
      break;
    }
    default:
      throw new Error("Unsupported manual run period");
  }

  return {
    start: localDateTimeToUtc(startDate, timeZone),
    end: localDateTimeToUtc(endDate, timeZone),
    completedSince: null,
  };
}
