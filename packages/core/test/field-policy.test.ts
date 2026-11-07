// TIP-045b annex C — FieldPolicy: vai trò trường hiện tại (Owner theo owner_user_id; agent trực kênh chỉ trường AI không giới hạn vai trò;
// thiếu roleKey → fail closed), trường hệ thống theo quyền hành động (giá vốn ↔ catalog.cost_view), định nghĩa đã xoá không còn được thấy.
import { describe, expect, it } from 'vitest';
import { AGENT_FIELD_ROLE, authzForRole, fieldRoleOf, type AuthzContext } from '@appchat/shared';
import { hiddenSystemFields, viewOf } from '../src/authz/fields';

const defs = {
  version: '4.1',
  defs: [
    { key: 'size', roles: [], ai: true, sys: false },
    { key: 'margin', roles: ['manager'], ai: true, sys: false },
    { key: 'note_internal', roles: [], ai: false, sys: false },
    { key: 'full_name', roles: [], ai: true, sys: true },
  ],
};
const agent: AuthzContext = { ...authzForRole('sales', 'a'), roleKey: AGENT_FIELD_ROLE };

describe('vai trò trường', () => {
  it('Owner = owner; thành viên = roleKey; thiếu roleKey → agent (fail closed)', () => {
    expect(fieldRoleOf(authzForRole('owner', 'u'))).toBe('owner');
    expect(fieldRoleOf(authzForRole('sales', 'u'))).toBe('sales');
    expect(fieldRoleOf({ ...authzForRole('manager', 'u'), roleKey: undefined })).toBe(AGENT_FIELD_ROLE);
  });

  it('manager thấy trường giới hạn manager; owner / sales không (roles là danh sách tường minh — custom-fields §24); agent chỉ trường AI chung', () => {
    expect([...viewOf('contact', authzForRole('owner', 'o'), defs).custom].sort()).toEqual(['note_internal', 'size']);
    expect([...viewOf('contact', authzForRole('manager', 'm'), defs).custom].sort()).toEqual(['margin', 'note_internal', 'size']);
    expect([...viewOf('contact', authzForRole('sales', 's'), defs).custom].sort()).toEqual(['note_internal', 'size']);
    expect([...viewOf('contact', agent, defs).custom]).toEqual(['size']);
  });

  it('trường hệ thống không nằm trong tập tuỳ biến; phiên bản định nghĩa đi kèm (cache key)', () => {
    const v = viewOf('contact', authzForRole('manager', 'o'), defs);
    expect(v.custom.has('full_name')).toBe(false);
    expect(v.known.has('full_name')).toBe(false);
    expect(v.version).toBe('4.1');
  });
});

describe('trường hệ thống theo quyền', () => {
  it('giá vốn ẩn khi thiếu catalog.cost_view (sales, cs, agent); hiện với owner / manager / accountant', () => {
    expect([...hiddenSystemFields('product', authzForRole('sales', 's'))]).toEqual(['cost']);
    expect([...hiddenSystemFields('product', authzForRole('cs', 'c'))]).toEqual(['cost']);
    expect([...hiddenSystemFields('product', agent)]).toEqual(['cost']);
    for (const r of ['owner', 'manager', 'accountant'] as const) expect(hiddenSystemFields('product', authzForRole(r, r)).size, r).toBe(0);
    expect(hiddenSystemFields('contact', authzForRole('sales', 's')).size).toBe(0);
  });
});
