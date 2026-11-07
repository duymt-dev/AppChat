// Contract FE ↔ BE (TIP-003 AC12) — phía HTTP thật: cùng CONTRACT_CASES như mock transport
// (apps/web/src/shared/api/mock/contract.test.ts), parse cùng zod output.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CONTRACT_CASES, checkActionResponse } from '@appchat/contract';
import { uuidv7 } from '@appchat/core';
import { call, startApi, type Harness } from './setup';

let h: Harness;
beforeAll(async () => {
  h = await startApi();
  // Các ca thêm tài khoản kênh (Zalo TIP-014, widget TIP-017) cùng workspace → gói nhiều kênh (gói Miễn phí chỉ 1 kênh).
  const team = await h.platform.plan.findUniqueOrThrow({ where: { key: 'team' } });
  await h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: h.ws, planId: team.id, status: 'active', currentPeriodStart: h.clock.now() } });
});
afterAll(async () => {
  await h?.close();
});

describe('contract HTTP /v1/actions', () => {
  it.each(CONTRACT_CASES.map((c) => [c.action, c] as const))('%s', async (_id, c) => {
    const res = await call(h, `/actions/${c.action}`, { input: c.input }, c.idempotent ? { 'idempotency-key': `contract-${c.action}` } : {});
    const body = (await res.json()) as { data: unknown };
    expect(checkActionResponse(c.action, res.status, body.data)).toEqual({ ok: true, status: res.status });
  });
});
