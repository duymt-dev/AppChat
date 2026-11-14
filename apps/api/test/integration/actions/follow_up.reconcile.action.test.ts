// Ma trận follow_up.reconcile (TIP-038 pha 2): system-only của sweep `insights.follow-up-sweep` (actor `system:follow-up`). HTTP (ui /
// assistant) → 403 dù là Owner; header system → 422; ẩn khỏi Trợ lý + tool agent. Luồng thật (executor nguồn system, hai sweep song song,
// supersede, không tự gửi tin): insights-dashboard.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SYSTEM_ONLY, assistantAllows } from '@appchat/core';
import { authzForRole } from '@appchat/shared';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('follow_up.reconcile');
}, 120_000);
afterAll(() => m?.close());

describe('follow_up.reconcile', () => {
  it('Owner qua HTTP (ui / assistant) → 403; header system → 422; không sinh việc', async () => {
    const input = { batch: '2026-11-06T09' };
    expect((await m.act(input)).status).toBe(403);
    expect((await m.act(input, undefined, { 'x-action-source': 'assistant' })).status).toBe(403);
    expect((await m.act(input, undefined, { 'x-action-source': 'system' })).status).toBe(422);
    expect(await (await m.db()).followUp.count()).toBe(0);
  });

  it('không agentGrantable, ẩn khỏi Trợ lý kể cả Owner', () => {
    expect(m.def.agentGrantable).toBe(false);
    expect(SYSTEM_ONLY.has('follow_up.reconcile')).toBe(true);
    expect(assistantAllows(m.def, authzForRole('owner', 'u1'))).toBe(false);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
