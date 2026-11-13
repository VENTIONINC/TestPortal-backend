// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { getManualRunPeriodBounds } from "@/lib/manualTestRunPeriod";

describe("manual run period bounds", () => {
  it("uses local calendar midnight across a daylight saving transition", () => {
    const bounds = getManualRunPeriodBounds({
      period: "today",
      now: new Date("2026-03-08T12:00:00.000Z"),
      timeZone: "America/Los_Angeles",
    });
    expect(bounds.start?.toISOString()).toBe("2026-03-08T08:00:00.000Z");
    expect(bounds.end?.toISOString()).toBe("2026-03-09T07:00:00.000Z");
    expect(bounds.completedSince).toBeNull();
  });

  it("uses the prior calendar month and an inclusive custom end date", () => {
    const now = new Date("2026-01-15T12:00:00.000Z");
    const lastMonth = getManualRunPeriodBounds({
      period: "last_month",
      now,
      timeZone: "Europe/Bratislava",
    });
    expect(lastMonth.start?.toISOString()).toBe("2025-11-30T23:00:00.000Z");
    expect(lastMonth.end?.toISOString()).toBe("2025-12-31T23:00:00.000Z");

    const custom = getManualRunPeriodBounds({
      period: "custom",
      now,
      timeZone: "Europe/Bratislava",
      dateFrom: "2026-01-03",
      dateTo: "2026-01-05",
    });
    expect(custom.start?.toISOString()).toBe("2026-01-02T23:00:00.000Z");
    expect(custom.end?.toISOString()).toBe("2026-01-05T23:00:00.000Z");
  });

  it("uses a rolling seven-day completion window for Recent", () => {
    const now = new Date("2026-11-12T14:30:00.000Z");
    expect(
      getManualRunPeriodBounds({
        period: "recent",
        now,
        timeZone: "UTC",
      }),
    ).toEqual({
      start: null,
      end: null,
      completedSince: new Date("2026-11-05T14:30:00.000Z"),
    });
  });
});
