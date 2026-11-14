// TIP-034b: phần thuần của từ điển gợi ý danh mục — cursor mờ (ký HMAC gắn workspace + người xem + thế hệ scope), luật realtime hai gói
// tin theo quyền (không nhãn trong payload), handler từ chối nhãn sai trước khi đọc DB, scope none không truy vấn. CAS / hoàn tác / scope
// thật ở integration (apps/api/test/integration/support-categories.test.ts).
import { describe, expect, it, vi } from 'vitest';
import { EVENT_SCHEMAS, type AuthzContext } from '@appchat/shared';
import '../src/support/categories/events';
import { realtimeEnvelopes } from '../src/notify/rules';
import { CategoryCursors, scopeGeneration, usedLabels } from '../src/support/categories/read';
import { TicketCategoriesReplaceHandler } from '../src/support/categories/handlers';
import type { ActionContext, TenantTx } from '../src/kernel/actions/action-context';

const WS = '0190f000-0000-7000-8000-000000000001';
const az = (over: Partial<AuthzContext> = {}): AuthzContext => ({ userId: 'u1', isOwner: false, permissions: new Set(['ticket.view']), scope: { support: 'own' } as AuthzContext['scope'], teamIds: [], ...over });

describe('cursor gợi ý danh mục', () => {
  const c = new CategoryCursors('k'.repeat(64));

  it('ký → kiểm trả đúng nhãn cuối (kể cả dấu / ký tự lạ)', () => {
    for (const label of ['Hoàn tiền', 'a.b_c', '😀 Giao hàng', 'x'.repeat(200)]) expect(c.verify(WS, az(), c.sign(WS, az(), label))).toBe(label);
  });

  it('khác người / workspace / sửa nhãn → 403; scope đổi → 409 stale', () => {
    const cur = c.sign(WS, az(), 'Giao hàng');
    expect(() => c.verify(WS, az({ userId: 'u2' }), cur)).toThrow(expect.objectContaining({ code: 'FORBIDDEN' }));
    expect(() => c.verify('0190f000-0000-7000-8000-000000000009', az(), cur)).toThrow(expect.objectContaining({ code: 'FORBIDDEN' }));
    const [, gen, mac] = cur.split('.');
    expect(() => c.verify(WS, az(), `${Buffer.from('Khác').toString('base64url')}.${gen}.${mac}`)).toThrow(expect.objectContaining({ code: 'FORBIDDEN' }));
    expect(() => c.verify(WS, az(), 'rác')).toThrow(expect.objectContaining({ code: 'FORBIDDEN' }));
    expect(() => c.verify(WS, az({ scope: { support: 'team' } as AuthzContext['scope'] }), cur)).toThrow(expect.objectContaining({ code: 'CONFLICT' }));
    expect(() => c.verify(WS, az({ teamIds: ['t1'] }), cur)).toThrow(expect.objectContaining({ code: 'CONFLICT' }));
  });

  it('thế hệ scope ổn định theo mức + tập nhóm (không theo thứ tự)', () => {
    expect(scopeGeneration(az({ teamIds: ['a', 'b'] }))).toBe(scopeGeneration(az({ teamIds: ['b', 'a'] })));
    expect(scopeGeneration(az({ isOwner: true }))).not.toBe(scopeGeneration(az()));
  });

  it('thiếu khoá → 501 (không ký cursor rỗng)', () => {
    expect(() => new CategoryCursors(null).sign(WS, az(), 'A')).toThrow(expect.objectContaining({ code: 'NOT_IMPLEMENTED' }));
  });
});

describe('đọc nhãn đã dùng', () => {
  it('scope none → rỗng, không truy vấn', async () => {
    const tx = { $queryRaw: vi.fn() } as unknown as TenantTx;
    expect(await usedLabels(tx, az({ scope: { support: 'none' } as AuthzContext['scope'] }), null)).toEqual({ labels: [], more: false });
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });

  it('lấy limit + 1 để biết còn trang', async () => {
    const tx = { $queryRaw: vi.fn().mockResolvedValue([{ category: 'A' }, { category: 'B' }, { category: 'C' }]) } as unknown as TenantTx;
    expect(await usedLabels(tx, az(), null, 2)).toEqual({ labels: ['A', 'B'], more: true });
  });
});

describe('realtime ticket_categories.changed', () => {
  it('hai gói tin riêng theo quyền, payload chỉ key + version', () => {
    const payload = { ws: WS, occurred_at: '2026-11-12T00:00:00.000Z', key: 'ticket_categories', version: 3 };
    expect(EVENT_SCHEMAS['ticket_categories.changed'].safeParse(payload).success).toBe(true);
    expect(EVENT_SCHEMAS['ticket_categories.changed'].safeParse({ ...payload, key: 'x' }).success).toBe(false);
    const env = realtimeEnvelopes({ id: 'e1', topic: 'ticket_categories.changed', workspaceId: WS, traceId: null, payload });
    expect(env.map((e) => [e.event, e.require?.permission, e.data])).toEqual([
      ['ticket_categories.config', 'settings.manage', { key: 'ticket_categories', version: 3 }],
      ['ticket_categories.suggestions', 'ticket.view', { key: 'ticket_categories', version: 3 }],
    ]);
  });
});

describe('ticket_categories.replace — kiểm nhãn trước khi đọc DB', () => {
  const h = new TicketCategoriesReplaceHandler({ now: () => new Date() });
  const tx = { $queryRaw: vi.fn() } as unknown as TenantTx;
  const ctx = { workspaceId: WS } as ActionContext;

  it.each([
    [[], { labels: 'empty' }],
    [['A', ' a '], { 'labels.1': 'duplicate' }],
    [['A', ''], { 'labels.1': 'empty' }],
    [['x'.repeat(61)], { 'labels.0': 'too_long' }],
    [['A\nB'], { 'labels.0': 'control' }],
    [Array.from({ length: 101 }, (_, i) => `n${i}`), { labels: 'too_many' }],
  ])('%j → 422 %j', async (labels, fields) => {
    await expect(h.preview(ctx, { labels, if_version: 0 }, tx)).rejects.toMatchObject({ code: 'VALIDATION_FAILED', fields });
    await expect(h.execute(ctx, { labels, if_version: 0 }, tx)).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });
});
