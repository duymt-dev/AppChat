// TIP-042 — hợp đồng action vai trò / nhóm + biên quyền DC-298 (shared policy). Quyền đúng, agentGrantable false, undo đúng chỗ;
// schema role của member.invite / set_role nhận bốn vai trò cũ + custom:<uuid>, từ chối owner / key tự chế.
import { describe, expect, it } from 'vitest';
import {
  OWNER_ONLY_PERMISSIONS,
  PERMISSIONS,
  ROLE_DEFS,
  checkRoleDraft,
  cloneSystemRole,
  escalationOf,
  isAssignableRoleKey,
  scopeEscalationOf,
} from '@appchat/shared';
import { getAction, memberInvite, memberSetRole, roleCreate, roleDelete, roleUpdate, teamCreate, teamSetMembers, teamUpdate } from './index';

const FULL = { inbox: 'own', crm: 'own', sales: 'none', booking: 'own', support: 'own', insights: 'own' };
const UUID = '0190f000-0000-7000-8000-000000000042';

describe('action role.* / team.*', () => {
  it('quyền + risk + agentGrantable false + undo đúng từng action', () => {
    const rows = [roleCreate, roleUpdate, roleDelete, teamCreate, teamUpdate, teamSetMembers].map((d) => [d.id, d.permission, d.risk, d.agentGrantable, !!d.undo]);
    expect(rows).toEqual([
      ['role.create', 'roles.manage', 'config', false, true],
      ['role.update', 'roles.manage', 'config', false, true],
      ['role.delete', 'roles.manage', 'delete', false, false],
      ['team.create', 'members.manage', 'config', false, false],
      ['team.update', 'members.manage', 'config', false, true],
      ['team.set_members', 'members.manage', 'config', false, true],
    ]);
    for (const id of ['role.create', 'team.set_members']) expect(getAction(id)?.invalidates).toContain('me');
  });

  it('client không gửi key / is_system khi tạo; update / delete bắt buộc if_version', () => {
    expect(roleCreate.input.safeParse({ name: 'Lễ tân', clone_from_key: 'cs' }).success).toBe(true);
    const r = roleCreate.input.safeParse({ name: 'X', key: 'owner', is_system: true, clone_from_key: 'cs' });
    expect(r.success && !('key' in r.data) && !('is_system' in r.data)).toBe(true);
    expect(roleCreate.input.safeParse({ name: '   ' }).success).toBe(false);
    expect(roleUpdate.input.safeParse({ role_key: `custom:${UUID}`, name: 'Y' }).success).toBe(false);
    expect(roleDelete.input.safeParse({ role_key: `custom:${UUID}` }).success).toBe(false);
    expect(teamSetMembers.input.safeParse({ team_id: UUID, if_version: 1, user_ids: [''] }).success).toBe(false);
  });

  it('member.invite / set_role: bốn vai trò cũ + custom:<uuid>; không owner / key tự chế', () => {
    for (const role of ['manager', 'sales', 'cs', 'accountant', `custom:${UUID}`]) expect(memberSetRole.input.safeParse({ user_id: 'u', role }).success).toBe(true);
    for (const role of ['owner', 'custom:', 'custom:admin', 'superuser']) expect(memberInvite.input.safeParse({ email: 'a@b.vn', role }).success).toBe(false);
  });
});

describe('DC-298 — biên quyền vai trò tuỳ biến', () => {
  it('sáu quyền riêng Chủ sở hữu không cấp được; key lạ / thiếu module / phạm vi sai bị nêu đúng chỗ (không lặng lọc)', () => {
    expect(OWNER_ONLY_PERMISSIONS).toHaveLength(6);
    expect(checkRoleDraft(['inbox.view', 'contract.sign', 'payment.refund_approve'], FULL)).toEqual([]);
    expect(checkRoleDraft(['billing.manage', 'hack.all'], FULL)).toEqual([
      { field: 'permissions', reason: 'owner_only', value: 'billing.manage' },
      { field: 'permissions', reason: 'unknown', value: 'hack.all' },
    ]);
    expect(checkRoleDraft([], { inbox: 'all' })).toHaveLength(5);
    expect(checkRoleDraft([], { ...FULL, crm: 'everything', marketing: 'all' })).toEqual([
      { field: 'data_scope', reason: 'invalid_scope', value: 'marketing' },
      { field: 'data_scope', reason: 'invalid_scope', value: 'crm' },
    ]);
  });

  it('nhân bản Chủ sở hữu bỏ sáu quyền + hai quyền uỷ quyền (bật rõ sau); nhân bản Quản lý không tự kèm uỷ quyền', () => {
    const o = cloneSystemRole('owner')!;
    expect(o.dropped.sort()).toEqual([...OWNER_ONLY_PERMISSIONS, 'contract.sign', 'payment.refund_approve'].sort());
    expect(o.permissions).toHaveLength(PERMISSIONS.length - 8);
    const m = cloneSystemRole('manager')!;
    expect(m.dropped).toEqual([]);
    expect(m.permissions).toEqual([...ROLE_DEFS.manager.permissions]);
    expect(m.permissions).not.toContain('contract.sign');
    expect(cloneSystemRole('custom:x')).toBeNull();
  });

  it('không cấp vượt quyền / phạm vi người gán; owner / custom: rỗng không gán được', () => {
    const mgr = new Set<string>(ROLE_DEFS.manager.permissions);
    expect(escalationOf(['inbox.view', 'contract.sign'], mgr)).toEqual(['contract.sign']);
    expect(scopeEscalationOf({ ...ROLE_DEFS.manager.scope }, ROLE_DEFS.sales.scope)).toEqual(['inbox', 'crm', 'sales', 'booking', 'support', 'insights']);
    expect(scopeEscalationOf(ROLE_DEFS.sales.scope, ROLE_DEFS.manager.scope)).toEqual([]);
    expect(['sales', `custom:${UUID}`].map(isAssignableRoleKey)).toEqual([true, true]);
    expect(['owner', 'custom:', 'xyz'].map(isAssignableRoleKey)).toEqual([false, false, false]);
  });
});
