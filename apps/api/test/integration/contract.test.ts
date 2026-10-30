// Contract FE ↔ BE (TIP-003 AC12) — phía HTTP thật: cùng CONTRACT_CASES như mock transport
// (apps/web/src/shared/api/mock/contract.test.ts), parse cùng zod output.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CONTRACT_CASES, checkActionResponse } from '@appchat/contract';
import { call, startApi, type Harness } from './setup';

let h: Harness;
beforeAll(async () => {
  h = await startApi();
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
