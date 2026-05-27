// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { jest } from '@jest/globals';

// Mock the prisma client to prevent Prisma from initializing during tests
jest.mock('@/prisma/client', () => ({ dbClient: {} }));

import { calculateErrorSimilarity, compareStackTraces } from '@/lib/error-analyzer';

describe('calculateErrorSimilarity', () => {
  it('returns 1 for very similar messages', () => {
    const m1 = 'TypeError: Variable undefined at line 3';
    const m2 = 'TypeError: Variable undefined at line 42';
    const score = calculateErrorSimilarity(m1, m2);
    expect(score).toBeCloseTo(1, 5);
  });

  it('returns lower score for different messages', () => {
    const score = calculateErrorSimilarity('Error: foo', 'Warning: bar');
    expect(score).toBeLessThan(0.5);
  });
});

describe('compareStackTraces', () => {
  it('returns 1 when stacks are equivalent ignoring line numbers', () => {
    const stack1 = [
      'at /app/file1.ts:10:2',
      'at /app/file2.ts:20:4',
      'at /app/file3.ts:30:6',
    ];
    const stack2 = [
      'at /app/file1.ts:12:8',
      'at /app/file2.ts:22:1',
      'at /app/file3.ts:32:9',
    ];
    const score = compareStackTraces(stack1, stack2);
    expect(score).toBeCloseTo(1, 5);
  });

  it('returns a low score for completely different stacks', () => {
    const score = compareStackTraces(
      ['at /x.ts:1:1'],
      ['at /y.ts:2:2'],
    );
    expect(score).toBeLessThan(0.3);
  });
});
