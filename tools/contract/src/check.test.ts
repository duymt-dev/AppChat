import { describe, expect, it } from 'vitest';
import { getAction } from '@appchat/actions';
import { CONTRACT_CASES } from './cases';
import { checkActionResponse } from './check';

describe('checkActionResponse', () => {
  it('200 đúng envelope + zod output → ok', () => {
    expect(checkActionResponse('notification.mark_read', 200, { result: { updated: 2 }, action_log_id: 'al_1' })).toEqual({ ok: true, status: 200 });
  });

  it('result lệch zod output / thiếu action_log_id → báo đúng path', () => {
    const r = checkActionResponse('notification.mark_read', 200, { result: { updated: '2' } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.join('\n')).toMatch(/data\.action_log_id/);
    const r2 = checkActionResponse('notification.mark_read', 200, { result: { count: 2 }, action_log_id: 'x' });
    expect(r2.ok === false && r2.issues[0]).toMatch(/^result\.updated/);
  });

  it('202 preview phải có confirm_token + expires_at; status khác 200/202 → lỗi', () => {
    const preview = { status: 'preview_required', preview: { summary: 's', risk: 'config' }, confirm_token: 't', expires_at: '2026-10-30T08:10:00.000Z' };
    expect(checkActionResponse('notification.mark_read', 202, preview).ok).toBe(true);
    expect(checkActionResponse('notification.mark_read', 202, { status: 'preview_required' }).ok).toBe(false);
    expect(checkActionResponse('notification.mark_read', 500, {}).ok).toBe(false);
  });

  it('mọi ca contract trỏ action có trong registry + input hợp lệ theo zod input', () => {
    for (const c of CONTRACT_CASES) expect(getAction(c.action)?.input.safeParse(c.input).success, c.action).toBe(true);
  });
});
