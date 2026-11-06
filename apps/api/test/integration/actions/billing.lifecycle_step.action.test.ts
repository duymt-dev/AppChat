// Ma trận billing.lifecycle_step (TIP-039 pha 1, DC-242 / DC-367): system-only của lịch \`billing.lifecycle\` (actor `system:billing`). HTTP (ui / assistant) → 403 dù
// là Owner; header system → 422; ẩn khỏi Trợ lý + tool agent; không ghi. Luồng thật (kỳ / hết hạn / đổi gói kỳ sau: billing-lifecycle.test.ts).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SYSTEM_ONLY, assistantAllows } from '@appchat/core';
import { authzForRole } from '@appchat/shared';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('billing.lifecycle_step');
}, 120_000);
afterAll(() => m?.close());

describe('billing.lifecycle_step', () => {
  it('Owner qua HTTP (ui / assistant) → 403; header system → 422; không ghi', async () => {
    const input = {};
    expect((await m.act(input)).status).toBe(403);
    expect((await m.act(input, undefined, { 'x-action-source': 'assistant' })).status).toBe(403);
    expect((await m.act(input, undefined, { 'x-action-source': 'system' })).status).toBe(422);
    expect(await m.h.platform.billingPeriodGrant.count({ where: { workspaceId: m.h.ws } })).toBe(0);
  });

  it('không agentGrantable, ẩn khỏi Trợ lý kể cả Owner', () => {
    expect(m.def.agentGrantable).toBe(false);
    expect(SYSTEM_ONLY.has('billing.lifecycle_step')).toBe(true);
    expect(assistantAllows(m.def, authzForRole('owner', 'u1'))).toBe(false);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
