// TIP-005 (unit): scopeFilter / inScope 4 mức + collaborator (D32), parseScope, registry seed, ma trận ROLE_DEFS ↔ §3.5.
import { describe, expect, it } from 'vitest';
import { DELEGABLE_PERMISSIONS, PERMISSIONS, PERMISSION_GROUPS, ROLE_DEFS, authzForRole, type AuthzContext } from '@appchat/shared';
import { SYSTEM_ROLES_SEED, assertInScope, inScope, parseScope, scopeFilter, tenantSeeds } from '../src';

const ctx = (scope: AuthzContext['scope'][keyof AuthzContext['scope']], extra: Partial<AuthzContext> = {}): AuthzContext => ({
  ...authzForRole('sales', 'me'),
  scope: { inbox: scope, crm: scope, sales: scope, booking: scope, support: scope, insights: scope },
  ...extra,
});
const F = { owner: 'ownerUserId', assignee: 'assigneeUserId' };

describe('scopeFilter', () => {
  it('all → {}; none → không khớp; Owner luôn all', () => {
    expect(scopeFilter(ctx('all'), 'crm', F)).toEqual({});
    expect(scopeFilter(ctx('none'), 'crm', F)).toEqual({ AND: [{ id: { in: [] } }] });
    expect(scopeFilter(ctx('none', { isOwner: true }), 'crm', F)).toEqual({});
  });

  it('own → owner = me OR assignee = me (+ khách collaborator)', () => {
    expect(scopeFilter(ctx('own'), 'crm', { owner: 'ownerUserId' })).toEqual({ ownerUserId: 'me' });
    expect(scopeFilter(ctx('own'), 'inbox', F)).toEqual({ OR: [{ ownerUserId: 'me' }, { assigneeUserId: 'me' }] });
    expect(scopeFilter(ctx('own'), 'crm', { owner: 'ownerUserId', contact: { field: 'id', ids: ['c1', 'c2'] } })).toEqual({
      OR: [{ ownerUserId: 'me' }, { id: { in: ['c1', 'c2'] } }],
    });
  });

  it('team (DC-299, TIP-042c) → owner = me HOẶC cột nhóm của bản ghi ∈ nhóm của mình — không suy từ thành viên nhóm', () => {
    const team = ctx('team', { teamIds: ['t1'], teamUserIds: ['a', 'me', 'b'] });
    expect(scopeFilter(team, 'sales', { owner: 'ownerUserId', team: 'teamId' })).toEqual({ OR: [{ ownerUserId: 'me' }, { teamId: { in: ['t1'] } }] });
    // Bảng không có cột nhóm → team chỉ còn nhánh own.
    expect(scopeFilter(team, 'sales', { owner: 'ownerUserId' })).toEqual({ ownerUserId: 'me' });
  });
});

describe('inScope / assertInScope', () => {
  it('đủ 4 mức; ngoài scope → SCOPE_FORBIDDEN 403', () => {
    const mine = { ownerUserId: 'me' };
    const other = { ownerUserId: 'x', assigneeUserId: 'y' };
    expect(inScope(ctx('own'), 'crm', mine, F)).toBe(true);
    expect(inScope(ctx('own'), 'crm', other, F)).toBe(false);
    expect(inScope(ctx('own'), 'crm', { ownerUserId: 'x', assigneeUserId: 'me' }, F)).toBe(true);
    expect(inScope(ctx('team', { teamUserIds: ['x'] }), 'crm', other, F)).toBe(false);
    expect(inScope(ctx('team', { teamIds: ['t1'] }), 'crm', { ...other, teamId: 't1' }, { ...F, team: 'teamId' })).toBe(true);
    expect(inScope(ctx('team', { teamIds: ['t1'] }), 'crm', { ...other, teamId: 't2' }, { ...F, team: 'teamId' })).toBe(false);
    expect(inScope(ctx('all'), 'crm', other, F)).toBe(true);
    expect(inScope(ctx('none'), 'crm', mine, F)).toBe(false);
    expect(inScope(ctx('own'), 'crm', { ownerUserId: 'x', contactId: 'c1' }, { owner: 'ownerUserId', contact: { field: 'contactId', ids: ['c1'] } })).toBe(true);
    expect(() => assertInScope(ctx('own'), 'crm', other, F)).toThrow(expect.objectContaining({ code: 'SCOPE_FORBIDDEN', httpStatus: 403 }));
  });
});

describe('vai trò', () => {
  it('parseScope: chỉ nhận module + mức hợp lệ, thiếu = none', () => {
    expect(parseScope({ crm: 'all', inbox: 'own', sales: 'bogus', x: 'all' })).toEqual({ inbox: 'own', crm: 'all', sales: 'none', booking: 'none', support: 'none', insights: 'none' });
    expect(parseScope(null).crm).toBe('none');
  });

  it('Blueprint §3.5: quyền chỉ Owner; Quản lý không có quyền uỷ quyền mặc định; Kế toán không vào Hộp thư', () => {
    for (const p of ['billing.manage', 'roles.manage', 'workspace.transfer_ownership', 'privacy.erase', 'finance.manage', 'ai.governance'] as const) {
      expect(['manager', 'sales', 'cs', 'accountant'].some((r) => ROLE_DEFS[r as 'manager'].permissions.includes(p))).toBe(false);
    }
    for (const p of DELEGABLE_PERMISSIONS) expect(ROLE_DEFS.manager.permissions).not.toContain(p);
    expect(ROLE_DEFS.accountant.permissions.some((p) => p.startsWith('inbox.'))).toBe(false);
    expect(ROLE_DEFS.accountant.scope.inbox).toBe('none');
    expect(ROLE_DEFS.cs.permissions).not.toContain('catalog.cost_view');
  });

  it('PERMISSION_GROUPS phủ đủ danh mục, nhóm theo tiền tố', () => {
    expect(Object.values(PERMISSION_GROUPS).flat().sort()).toEqual([...PERMISSIONS].sort());
    expect(PERMISSION_GROUPS.quote).toEqual(['quote.view', 'quote.create', 'quote.send', 'quote.approve']);
  });

  it('seed vai trò hệ thống đã đăng ký vào registry seed của kernel', () => {
    expect(tenantSeeds()).toContain(SYSTEM_ROLES_SEED);
  });
});
