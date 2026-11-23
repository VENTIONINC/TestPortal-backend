// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from '@jest/globals';

const tx = {
  $queryRaw: jest.fn<() => Promise<unknown>>(),
  manualTestRunScenario: {
    findMany: jest.fn<() => Promise<unknown>>(),
    updateMany: jest.fn<() => Promise<unknown>>(),
  },
};
const transaction = jest.fn<(fn: (client: typeof tx) => Promise<unknown>) => Promise<unknown>>();
jest.mock('@/prisma/client', () => ({ dbClient: { $transaction: transaction } }));
jest.mock('@/models/manualTestRunCreationModel', () => ({ manualTestRunCreationModel: {} }));
import { manualTestRunLifecycleModel } from '@/models/manualTestRunLifecycleModel';

describe('fully marked completion', () => {
  it('rejects without changing results when a scenario is untested under the run lock', async () => {
    tx.$queryRaw.mockReset().mockResolvedValueOnce([{ status: 'in_progress' }]).mockResolvedValueOnce([{ id: 'user' }]);
    tx.manualTestRunScenario.findMany.mockResolvedValue([{ id: 'scenario' }]);
    transaction.mockImplementation(async (fn) => fn(tx));
    await expect(manualTestRunLifecycleModel.complete({
      projectId: 'project', runId: 'run', completedById: 'user', requireAllMarked: true,
    } as Parameters<typeof manualTestRunLifecycleModel.complete>[0])).rejects.toThrow(/untested/i);
    expect(tx.manualTestRunScenario.updateMany).not.toHaveBeenCalled();
  });
});
