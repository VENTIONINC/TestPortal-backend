/**
 * Utilities for generating execution identifiers with date-based granularity
 * to remove vendor lock on runId parameter
 */

export type TimePeriod = "night" | "morning" | "afternoon" | "evening";
export type IdentifierStrategy = "time-period" | "hourly" | "daily";

export interface ExecutionIdentifierConfig {
  env?: string;
  version?: string;
  startTime?: Date | string;
  strategy?: IdentifierStrategy;
}

/**
 * Determine time period based on hour (24-hour format)
 * - night: 0-6
 * - morning: 6-12
 * - afternoon: 12-18
 * - evening: 18-24
 */
export function getTimePeriod(hour: number): TimePeriod {
  if (hour >= 0 && hour < 6) return "night";
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDateOnly(date: Date): string {
  const datePart = date.toISOString().split("T")[0];
  return datePart ?? "";
}

/**
 * Format hour as HH (00-23)
 */
export function formatHour(date: Date): string {
  return date.getHours().toString().padStart(2, "0");
}

/**
 * Generate a date-based execution identifier with configurable granularity
 */
export function generateExecutionIdentifier(
  config: ExecutionIdentifierConfig,
): string {
  const {
    env = "unknown",
    version = "unknown",
    startTime = new Date(),
    strategy = "time-period",
  } = config;

  const date = new Date(startTime);
  const dateStr = formatDateOnly(date);
  
  let timeComponent: string;
  
  switch (strategy) {
    case "hourly":
      timeComponent = formatHour(date);
      break;
    case "daily":
      timeComponent = "";
      break;
    case "time-period":
    default:
      timeComponent = getTimePeriod(date.getHours());
      break;
  }

  const parts = [env, version, dateStr];
  if (timeComponent) {
    parts.push(timeComponent);
  }

  return parts.join("_").toUpperCase();
}

/**
 * Extract date information from a runId if it contains date patterns
 * Supports formats like: 14-05-2025-07:28:38 or 2025-05-14
 */
export function extractDateFromRunId(runId: string): Date | null {
  // Try to match DD-MM-YYYY-HH:MM:SS pattern
  const ddmmyyyyPattern = /(\d{2})-(\d{2})-(\d{4})-(\d{2}):(\d{2}):(\d{2})/;
  const ddmmMatch = runId.match(ddmmyyyyPattern);
  
  if (ddmmMatch) {
    const [, day, month, year, hour, minute, second] = ddmmMatch;
    return new Date(
      Number(year),
      Number(month) - 1, // Month is 0-indexed
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );
  }

  // Try to match YYYY-MM-DD pattern
  const yyyymmddPattern = /(\d{4})-(\d{2})-(\d{2})/;
  const yyyyMatch = runId.match(yyyymmddPattern);
  
  if (yyyyMatch) {
    const [, year, month, day] = yyyyMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
    );
  }

  return null;
}

/**
 * Generate fallback identifier when runId is not provided
 */
export function generateFallbackIdentifier(
  env?: string,
  version?: string,
  startTime?: Date | string,
  strategy: IdentifierStrategy = "time-period",
): string {
  return generateExecutionIdentifier({
    env: env ?? "unknown",
    version: version ?? "unknown",
    startTime: startTime ?? new Date(),
    strategy,
  });
}