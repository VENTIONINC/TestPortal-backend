import { createHash } from "node:crypto";

export interface SeedRng {
  next(): number;
  nextInt(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  chance(probability: number): boolean;
}

export const FIXED_PROFILE = {
  name: "medium",
  seedKey: "preview-medium-v1",
  projectName: "Frontend Performance Preview Project",
  projectDescription:
    "Temporary local-only generated dataset for frontend performance inspection.",
  outputFileName: "test-portal-preview-seed.json",
  executionCount: 48,
  minSpecsPerExecution: 55,
  maxSpecsPerExecution: 95,
  daySpread: 42,
  issueLimit: 18,
} as const;

export function deterministicUuid(...parts: string[]): string {
  const hex = createHash("sha1").update(parts.join("|")).digest("hex");
  const chars = hex.slice(0, 32).split("");
  chars[12] = "5";
  const variant = parseInt(chars[16] ?? "0", 16);
  chars[16] = ((variant & 0x3) | 0x8).toString(16);

  return `${chars.slice(0, 8).join("")}-${chars.slice(8, 12).join("")}-${chars.slice(12, 16).join("")}-${chars.slice(16, 20).join("")}-${chars.slice(20, 32).join("")}`;
}

export function createSeedRng(seed: string): SeedRng {
  let state = Number.parseInt(
    createHash("sha256").update(seed).digest("hex").slice(0, 8),
    16,
  );

  const next = (): number => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    nextInt(min: number, max: number): number {
      const lower = Math.ceil(min);
      const upper = Math.floor(max);
      return Math.floor(next() * (upper - lower + 1)) + lower;
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) {
        throw new Error("Cannot pick from an empty list");
      }
      return items[Math.floor(next() * items.length)] as T;
    },
    chance(probability: number): boolean {
      return next() < probability;
    },
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function toDateOnlyIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function stableKey(...parts: string[]): string {
  return createHash("sha1").update(parts.join("|")).digest("hex");
}
