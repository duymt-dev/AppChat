// Ma trận digest.dispatch (TIP-038 pha 4, DC-366): system-only của lịch `insights.digest` (actor `system:digest`). HTTP (ui / assistant)
// → 403 dù là Owner; header system → 422; ẩn khỏi Trợ lý + tool agent; không ghi sổ. Luồng thật (plan / claim / gửi sau commit, DND,
// quyền hiện tại, unknown không gửi lại): digest.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SYSTEM_ONLY, assistantAllows } from '@appchat/core';
import { authzForRole } from '@appchat/shared';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('digest.dispatch');
}, 120_000);
afterAll(() => m?.close());

describe('digest.dispatch', () => {
  it('Owner qua HTTP (ui / assistant) → 403; header system → 422; không ghi sổ, không gửi', async () => {
    for (const step of ['plan', 'send'] as const) {
      expect((await m.act({ step })).status).toBe(403);
      expect((await m.act({ step }, undefined, { 'x-action-source': 'assistant' })).status).toBe(403);
      expect((await m.act({ step }, undefined, { 'x-action-source': 'system' })).status).toBe(422);
    }
    expect(await (await m.db()).digestDelivery.count()).toBe(0);
  });

  it('không agentGrantable, ẩn khỏi Trợ lý kể cả Owner', () => {
    expect(m.def.agentGrantable).toBe(false);
    expect(SYSTEM_ONLY.has('digest.dispatch')).toBe(true);
    expect(assistantAllows(m.def, authzForRole('owner', 'u1'))).toBe(false);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
