// Ma trận privacy.cleanup_step (TIP-015c pha 2): system-only driver của sweep job. HTTP (ui / assistant) → 403 dù là Owner; header
// system → 422 (HTTP chỉ nhận ui / assistant / api); ẩn khỏi Trợ lý + tool agent. Luồng thật (executor nguồn system, tiến từng bước):
// privacy-cleanup.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SYSTEM_ONLY, assistantAllows, uuidv7 } from '@appchat/core';
import { authzForRole } from '@appchat/shared';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('privacy.cleanup_step');
}, 120_000);
afterAll(() => m?.close());

describe('privacy.cleanup_step', () => {
  it('Owner qua HTTP (ui / assistant) → 403; header system → 422; không đổi phase', async () => {
    const input = { operation_id: uuidv7() };
    expect((await m.act(input)).status).toBe(403);
    expect((await m.act(input, undefined, { 'x-action-source': 'assistant' })).status).toBe(403);
    expect((await m.act(input, undefined, { 'x-action-source': 'system' })).status).toBe(422);
  });

  it('không agentGrantable, ẩn khỏi Trợ lý kể cả Owner', () => {
    expect(m.def.agentGrantable).toBe(false);
    expect(SYSTEM_ONLY.has('privacy.cleanup_step')).toBe(true);
    expect(assistantAllows(m.def, authzForRole('owner', 'u1'))).toBe(false);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
