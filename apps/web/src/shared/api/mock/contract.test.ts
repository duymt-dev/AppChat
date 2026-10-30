// Contract FE ↔ BE (TIP-003 AC12) — phía mock: chạy CONTRACT_CASES qua mock transport, parse cùng zod như HTTP thật
// (apps/api/test/integration/contract.test.ts).
import { beforeEach, describe, expect, it } from 'vitest';
import { CONTRACT_CASES, checkActionResponse } from '@appchat/contract';
import { mockTransport } from './mock-transport';
import { setMockRole } from './store';

describe('contract mock transport', () => {
  beforeEach(() => setMockRole('owner'));

  it.each(CONTRACT_CASES.map((c) => [c.action, c] as const))('%s', async (_id, c) => {
    const res = await mockTransport.action(c.action, c.input, c.idempotent ? { idempotencyKey: `contract-${c.action}` } : undefined);
    expect(checkActionResponse(c.action, res.status, res.data)).toEqual({ ok: true, status: res.status });
  });
});
