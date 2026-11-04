// Ma trận loyalty.expire (TIP-036): callback system-only của consumer / job loyalty (hết hạn FIFO). HTTP (ui / assistant) → 403 dù là Owner; header
// system → 422 (HTTP chỉ nhận ui / assistant / api); ẩn khỏi Trợ lý + tool agent. Luồng thật (executor nguồn system, chạy lại không ghi
// hai lần): loyalty-events.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SYSTEM_ONLY, assistantAllows } from '@appchat/core';
import { authzForRole } from '@appchat/shared';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let input: Record<string, unknown>;

beforeAll(async () => {
  m = await matrix('loyalty.expire');
  const c = (await m.seed('contact.create', { full_name: 'Khách hệ thống', phone: '0909363003' })).contact_id as string;
  input = { contact_id: c };
}, 120_000);
afterAll(() => m?.close());

describe('loyalty.expire', () => {
  it('Owner qua HTTP (ui / assistant) → 403; header system → 422; sổ không đổi', async () => {
    expect((await m.act(input)).status).toBe(403);
    expect((await m.act(input, undefined, { 'x-action-source': 'assistant' })).status).toBe(403);
    expect((await m.act(input, undefined, { 'x-action-source': 'system' })).status).toBe(422);
    expect(await (await m.db()).loyaltyLedger.count()).toBe(0);
  });

  it('không agentGrantable, ẩn khỏi Trợ lý kể cả Owner', () => {
    expect(m.def.agentGrantable).toBe(false);
    expect(SYSTEM_ONLY.has('loyalty.expire')).toBe(true);
    expect(assistantAllows(m.def, authzForRole('owner', 'u1'))).toBe(false);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
