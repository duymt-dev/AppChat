// Ma trận bank_feed.ingest (TIP-012b P2, DC-383): system-only của consumer `bank_receipt.accepted` (actor `system:bank-ingress`). HTTP
// (ui / assistant) → 403 dù là Owner; header system → 422 (HTTP chỉ nhận ui / assistant / api); ẩn khỏi Trợ lý + tool agent; không ghi.
// Luồng thật (executor nguồn system, gửi lại / hai worker / kết nối lại → một ghi nhận): bank-ingress.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SYSTEM_ONLY, assistantAllows, uuidv7 } from '@appchat/core';
import { authzForRole } from '@appchat/shared';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('bank_feed.ingest');
}, 120_000);
afterAll(() => m?.close());

describe('bank_feed.ingest', () => {
  it('Owner qua HTTP (ui / assistant) → 403; header system → 422; không ghi bank_tx', async () => {
    const input = { receipt_id: uuidv7() };
    expect((await m.act(input)).status).toBe(403);
    expect((await m.act(input, undefined, { 'x-action-source': 'assistant' })).status).toBe(403);
    expect((await m.act(input, undefined, { 'x-action-source': 'system' })).status).toBe(422);
    expect(await (await m.db()).bankTx.count()).toBe(0);
  });

  it('không agentGrantable, ẩn khỏi Trợ lý kể cả Owner', () => {
    expect(m.def.agentGrantable).toBe(false);
    expect(m.def.risk).toBe('money');
    expect(SYSTEM_ONLY.has('bank_feed.ingest')).toBe(true);
    expect(assistantAllows(m.def, authzForRole('owner', 'u1'))).toBe(false);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
