// Ma trận billing.apply_invoice (TIP-039 pha 1, DC-242 / DC-367): system-only của ghi nhận hoá đơn gói đã trả (actor `system:billing`). HTTP (ui / assistant) → 403 dù
// là Owner; header system → 422; ẩn khỏi Trợ lý + tool agent; không ghi. Luồng thật (ảnh chụp / ghi nhận lại / giữ đối soát / khôi phục: billing-lifecycle.test.ts).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SYSTEM_ONLY, assistantAllows } from '@appchat/core';
import { authzForRole } from '@appchat/shared';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('billing.apply_invoice');
}, 120_000);
afterAll(() => m?.close());

describe('billing.apply_invoice', () => {
  it('Owner qua HTTP (ui / assistant) → 403; header system → 422; không ghi', async () => {
    const input = { invoice_id: '0190a000-0000-7000-8000-000000000001' };
    expect((await m.act(input)).status).toBe(403);
    expect((await m.act(input, undefined, { 'x-action-source': 'assistant' })).status).toBe(403);
    expect((await m.act(input, undefined, { 'x-action-source': 'system' })).status).toBe(422);
    expect(await m.h.platform.subscriptionAddon.count({ where: { workspaceId: m.h.ws } })).toBe(0);
  });

  it('không agentGrantable, ẩn khỏi Trợ lý kể cả Owner', () => {
    expect(m.def.agentGrantable).toBe(false);
    expect(SYSTEM_ONLY.has('billing.apply_invoice')).toBe(true);
    expect(assistantAllows(m.def, authzForRole('owner', 'u1'))).toBe(false);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
