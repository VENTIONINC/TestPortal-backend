import { z } from "zod";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_OR_DATETIME_PATTERN = /^(\d{4}-\d{2}-\d{2})(?:T.*)?$/;
const MAX_PERIOD_DAYS = 365;

function isValidIsoDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
  );
}

function toUtcDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function extractDatePart(value: string): string | null {
  const match = value.match(DATE_OR_DATETIME_PATTERN);
  const datePart = match?.[1];

  if (!datePart) {
    return null;
  }

  return isValidIsoDate(datePart) ? datePart : null;
}

export const pdfExportSchema = z
  .object({
    project: z.string().min(1),
    environment: z.string().min(1),
    executionType: z.string().min(1),
    periodStart: z.string().refine((value) => extractDatePart(value) !== null, {
      message: "Invalid periodStart date",
    }),
    periodEnd: z.string().refine((value) => extractDatePart(value) !== null, {
      message: "Invalid periodEnd date",
    }),
    granularity: z.enum(["daily", "weekly", "monthly"]),
  })
  .superRefine((input, ctx) => {
    const startDatePart = extractDatePart(input.periodStart);
    const endDatePart = extractDatePart(input.periodEnd);

    if (!startDatePart || !endDatePart) {
      return;
    }

    if (startDatePart > endDatePart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "periodStart must be less than or equal to periodEnd",
        path: ["periodEnd"],
      });
      return;
    }

    const start = toUtcDate(startDatePart);
    const end = toUtcDate(endDatePart);
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays > MAX_PERIOD_DAYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "PERIOD_TOO_LARGE",
        path: ["periodEnd"],
      });
    }
  })
  .transform((input) => {
    const periodStart = extractDatePart(input.periodStart) ?? input.periodStart;
    const periodEnd = extractDatePart(input.periodEnd) ?? input.periodEnd;

    return {
      ...input,
      periodStart,
      periodEnd,
    };
  });

export type PdfExportInput = z.infer<typeof pdfExportSchema>;
