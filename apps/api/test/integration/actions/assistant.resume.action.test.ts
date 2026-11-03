// Ma trận assistant.resume (TIP-023c hợp đồng 2): server tự kiểm — tài khoản chưa connected → không tiếp tục; connected + run của người
// gọi → tiếp tục đúng MỘT lần (biên nhận unique run+node+attempt, gọi lại → duplicate); run của người khác → 404; thiếu channels.manage
// → không tiếp tục; run đã huỷ → không sống lại. Idempotency / undo: không áp dụng (risk read, receipt là chốt chống lặp).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let acc: string;
let pending: string;
const run = async (userId: string, status: 'waiting_approval' | 'cancelled' = 'waiting_approval') => {
  const db = await m.db();
  const id = uuidv7();
  await db.aiRun.create({ data: { id, kind: 'assistant', tier: 'standard', input: {}, rootRunId: id, initiatedByUserId: userId, status, startedAt: m.h.clock.now() } });
  return id;
};

beforeAll(async () => {
  m = await matrix('assistant.resume');
  const db = await m.db();
  acc = uuidv7();
  pending = uuidv7();
  await db.channelAccount.create({ data: { id: acc, type: 'zalo_personal', name: 'Zalo Shop', status: 'connected', createdAt: m.h.clock.now() } });
  await db.channelAccount.create({ data: { id: pending, type: 'zalo_personal', name: 'Zalo Mới', status: 'connecting', createdAt: m.h.clock.now() } });
}, 120_000);
afterAll(() => m?.close());

describe('assistant.resume', () => {
  it('connected → tiếp tục một lần; gọi lại → duplicate', async () => {
    const r = await run(m.h.user);
    const body = { run_id: r, node: '0.1', channel_account_id: acc, attempt: 'attempt-0001' };
    const a = await m.act(body);
    expect(a.status, JSON.stringify(a.body)).toBe(200);
    expect(a.body.data.result).toEqual({ resumed: true, status: 'connected' });
    expect((await m.act(body)).body.data.result).toEqual({ resumed: false, status: 'duplicate' });
  });

  it('tài khoản chưa connected → không tiếp tục (không tin client)', async () => {
    const r = await run(m.h.user);
    expect((await m.act({ run_id: r, node: '0', channel_account_id: pending, attempt: 'attempt-0002' })).body.data.result.resumed).toBe(false);
  });

  it('run của người khác → 404; run đã huỷ → không sống lại', async () => {
    const other = await run(m.sales.id);
    expect((await m.act({ run_id: other, node: '0', channel_account_id: acc, attempt: 'attempt-0003' })).status).toBe(404);
    const cancelled = await run(m.h.user, 'cancelled');
    expect((await m.act({ run_id: cancelled, node: '0', channel_account_id: acc, attempt: 'attempt-0004' })).body.data.result).toEqual({ resumed: false, status: 'cancelled' });
  });

  it('thiếu channels.manage → không tiếp tục', async () => {
    const r = await run(m.cs.id);
    expect((await m.act({ run_id: r, node: '0', channel_account_id: acc, attempt: 'attempt-0005' }, m.cs)).body.data?.result?.resumed ?? false).toBe(false);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
  });
});
