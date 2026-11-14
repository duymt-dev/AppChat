// TIP-045b annex C — output không mang trường bị ẩn: DTO REST (projectRow / projectCustom bỏ HẲN key, không thay 0 / rỗng; `hidden_fields`),
// output action (UI / Trợ lý / agent — projectActionOutput kể cả lồng sâu), gói tin realtime (không mang `custom` / giá vốn).
import { describe, expect, it } from 'vitest';
import { AGENT_FIELD_ROLE, authzForRole, type AuthzContext } from '@appchat/shared';
import { entityOfAction, projectActionOutput, projectCustom, projectRow, stripRealtimeFields, viewOf } from '../src/authz/fields';

const rows = [
  { key: 'size', roles: [] as string[], ai: true, sys: false, updatedAt: new Date(1) },
  { key: 'margin', roles: ['manager'], ai: true, sys: false, updatedAt: new Date(2) },
];
const defs = { version: '2.2', defs: rows.map((r) => ({ key: r.key, roles: r.roles, ai: r.ai, sys: r.sys })) };
const db = { customFieldDef: { findMany: async () => rows } } as never;
const agent: AuthzContext = { ...authzForRole('sales', 'a'), roleKey: AGENT_FIELD_ROLE };

describe('DTO REST', () => {
  it('bỏ key tuỳ biến bị ẩn + key đã xoá (không có định nghĩa); giữ key được thấy', () => {
    const v = viewOf('contact', authzForRole('sales', 's'), defs);
    expect(projectCustom(v, { size: 'L', margin: '30%', deleted_key: 'x' })).toEqual({ size: 'L' });
    expect(projectCustom(v, null)).toEqual({});
  });

  it('giá vốn: sales → không có khoá `cost` (không phải "0") + hidden_fields; manager giữ nguyên', () => {
    const row = { id: 'p1', price: '100000', cost: '60000', custom: { size: 'L', margin: '40%' } };
    const s = projectRow(viewOf('product', authzForRole('sales', 's'), defs), row);
    expect('cost' in s).toBe(false);
    expect(s.hidden_fields).toEqual(['cost']);
    expect(s.custom).toEqual({ size: 'L' });
    expect(JSON.stringify(s)).not.toContain('60000');
    const m = projectRow(viewOf('product', authzForRole('manager', 'm'), defs), row);
    expect(m.cost).toBe('60000');
    expect(m.hidden_fields).toBeUndefined();
  });
});

describe('output action', () => {
  it('entity theo tiền tố action id', () => {
    expect(entityOfAction('product.get')).toBe('product');
    expect(entityOfAction('contact.get_360')).toBe('contact');
    expect(entityOfAction('kb.search')).toBeNull();
  });

  it('agent đọc product.search: không thấy cost / trường giới hạn vai trò, kể cả trong mảng lồng', async () => {
    const out = await projectActionOutput(db, 'product.search', agent, { items: [{ id: 'p', cost: '5', custom: { size: 'M', margin: '9%' } }] });
    expect(out).toEqual({ items: [{ id: 'p', custom: { size: 'M' }, hidden_fields: ['cost'] }] });
  });

  it('không có custom / trường ẩn → trả nguyên object (không đọc DB)', async () => {
    const out = { items: [{ id: 'p', price: '1' }] };
    const noDb = {
      customFieldDef: {
        findMany: async () => {
          throw new Error('không được đọc');
        },
      },
    } as never;
    expect(await projectActionOutput(noDb, 'product.search', authzForRole('owner', 'o'), out)).toBe(out);
  });
});

describe('realtime', () => {
  it('gói tin không mang custom / giá vốn ở mọi độ sâu; id giữ nguyên', () => {
    expect(stripRealtimeFields({ ticket_id: 't', custom: { a: 1 }, nested: [{ cost: '9', id: 'x' }] })).toEqual({ ticket_id: 't', nested: [{ id: 'x' }] });
  });
});
