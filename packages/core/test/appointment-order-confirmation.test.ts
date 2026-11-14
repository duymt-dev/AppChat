// TIP-033c §3.1–3.3 (unit): confirm_token ràng dữ kiện nguồn phía server — take() trả đúng dữ kiện đã ràng một lần (gửi lại → null), sai
// input / actor → null; token không ràng dữ kiện → {} (action cũ giữ nguyên hành vi). assertBoundPreview: lệch bất kỳ trường → 409
// `preview: stale` (không âm thầm theo giá mới); không có dữ kiện (nguồn chạy thẳng) → bỏ qua. Policy: xem trước bắt buộc cho mọi nguồn.
import { describe, expect, it } from 'vitest';
import { ConfirmTokens } from '../src/kernel/actions/confirm-token';
import { assertBoundPreview } from '../src/kernel/actions/preview-binding';
import { decidePolicy } from '../src/kernel/actions/policy';
import type { ActionContext } from '../src/kernel/actions/action-context';
import type { KeyValueStore } from '../src/kernel/redis';

function kv(): KeyValueStore {
  const m = new Map<string, string>();
  return {
    set: async (k: string, v: string) => (m.set(k, v), 'OK'),
    getdel: async (k: string) => {
      const v = m.get(k) ?? null;
      m.delete(k);
      return v;
    },
  } as unknown as KeyValueStore;
}
const ctx = (user = 'u1') => ({ workspaceId: 'w1', source: 'ui', actor: { type: 'user', id: user } }) as unknown as ActionContext;
const ID = 'order.create_from_appointment';
const facts = { appointment_version: 3, unit_price: '300000', tax_rate: 8 };

describe('ConfirmTokens.take — dữ kiện ràng phía server', () => {
  it('trả đúng dữ kiện một lần; gửi lại token → null', async () => {
    const t = new ConfirmTokens(kv(), 'secret');
    const { token } = await t.issue(ctx(), ID, { appointment_id: 'a1' }, 0, facts);
    expect(await t.take(ctx(), ID, { appointment_id: 'a1' }, token)).toEqual(facts);
    expect(await t.take(ctx(), ID, { appointment_id: 'a1' }, token)).toBeNull();
  });
  it('khác input / actor / action → null (và token bị tiêu)', async () => {
    const t = new ConfirmTokens(kv(), 'secret');
    const a = await t.issue(ctx(), ID, { appointment_id: 'a1' }, 0, facts);
    expect(await t.take(ctx(), ID, { appointment_id: 'a2' }, a.token)).toBeNull();
    const b = await t.issue(ctx(), ID, { appointment_id: 'a1' }, 0, facts);
    expect(await t.take(ctx('u2'), ID, { appointment_id: 'a1' }, b.token)).toBeNull();
    const c = await t.issue(ctx(), ID, { appointment_id: 'a1' }, 0, facts);
    expect(await t.consume(ctx(), 'order.create', { appointment_id: 'a1' }, c.token)).toBe(false);
  });
  it('token không ràng dữ kiện → {} và consume() vẫn như cũ', async () => {
    const t = new ConfirmTokens(kv(), 'secret');
    const a = await t.issue(ctx(), 'tag.create', { name: 'VIP' }, 0);
    expect(await t.take(ctx(), 'tag.create', { name: 'VIP' }, a.token)).toEqual({});
    const b = await t.issue(ctx(), 'tag.create', { name: 'VIP' }, 0, {});
    expect(await t.consume(ctx(), 'tag.create', { name: 'VIP' }, b.token)).toBe(true);
    expect(await t.take(ctx(), 'tag.create', { name: 'VIP' }, undefined)).toBeNull();
  });
});

describe('assertBoundPreview', () => {
  it('khớp → qua; không có dữ kiện ràng → qua', () => {
    expect(() => assertBoundPreview(facts, { ...facts, extra: 1 })).not.toThrow();
    expect(() => assertBoundPreview(undefined, facts)).not.toThrow();
  });
  it('đổi giá / thuế / version → 409 preview stale, nêu trường đổi', () => {
    for (const k of Object.keys(facts) as (keyof typeof facts)[]) {
      const now = { ...facts, [k]: k === 'unit_price' ? '350000' : 99 };
      try {
        assertBoundPreview(facts, now);
        throw new Error('không ném');
      } catch (e) {
        expect(e).toMatchObject({ code: 'CONFLICT', httpStatus: 409, fields: { preview: 'stale', [k]: 'changed' } });
      }
    }
  });
});

describe('policy — xem trước bắt buộc cho tạo đơn từ lịch hẹn', () => {
  it('ui / api / system / assistant → preview; agent / task theo bảng gốc (write = run)', () => {
    for (const source of ['ui', 'api', 'system', 'assistant'] as const) expect(decidePolicy({ source, risk: 'write', actionId: ID })).toBe('preview');
    expect(decidePolicy({ source: 'agent', risk: 'write', actionId: ID })).toBe('run');
  });
});
