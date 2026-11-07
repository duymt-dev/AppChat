// TIP-013: route mock Cài đặt đúng shape đọc dùng chung với API thật (packages/shared/src/api/settings.ts).
import { beforeEach, describe, expect, it } from 'vitest';
import type { z } from 'zod';
import { membersPageSchema, settingsRolesSchema, slaSettingsSchema, teamsSchema, workspaceSettingsSchema } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { setMockRole } from './store';

const issues = (schema: z.ZodType, v: unknown) => {
  const r = schema.safeParse(v);
  return r.success ? [] : r.error.issues;
};

describe('mock Cài đặt — shape FE ↔ BE', () => {
  beforeEach(() => setMockRole('owner'));

  it('GET /settings/workspace · /settings/roles · /settings/sla', async () => {
    expect(issues(workspaceSettingsSchema, await mockTransport.get('/settings/workspace'))).toEqual([]);
    expect(issues(settingsRolesSchema, await mockTransport.get('/settings/roles'))).toEqual([]);
    expect(issues(slaSettingsSchema, await mockTransport.get('/settings/sla'))).toEqual([]);
  });

  it('GET /settings/members — lời mời mới có cờ invite', async () => {
    await mockTransport.action('member.invite', { email: 'shape@spa.vn', role: 'cs' });
    const page = await mockTransport.get<{ data: { email: string; invite: boolean }[] }>('/settings/members');
    expect(issues(membersPageSchema, page)).toEqual([]);
    expect(page.data.find((m) => m.email === 'shape@spa.vn')?.invite).toBe(true);
  });

  it('TIP-042: vai trò tuỳ biến + nhóm — cùng zod với API; nhân bản Chủ sở hữu bỏ quyền riêng; CAS; gán vai trò tuỳ biến', async () => {
    const c = await mockTransport.action<{ key: string; dropped?: string[] }>('role.create', { name: 'Phó quản lý', clone_from_key: 'owner' });
    if (c.status !== 200) throw new Error('role.create');
    const key = c.data.result.key;
    expect(c.data.result.dropped).toContain('billing.manage');
    const roles = await mockTransport.get<{ roles: { key: string; name: string; permissions: string[] }[] }>('/settings/roles');
    expect(issues(settingsRolesSchema, roles)).toEqual([]);
    const role = roles.roles.find((r) => r.key === key)!;
    expect(role.name).toBe('Phó quản lý');
    expect(role.permissions).not.toContain('roles.manage');
    await expect(mockTransport.action('role.update', { role_key: key, if_version: 9, name: 'X' })).rejects.toMatchObject({ error: { code: 'STALE_VERSION' } });
    await expect(mockTransport.action('role.update', { role_key: 'cs', if_version: 1, name: 'X' })).rejects.toMatchObject({ status: 422 });
    await mockTransport.action('member.set_role', { user_id: 'u_huong', role: key });
    await expect(mockTransport.action('role.delete', { role_key: key, if_version: 1 })).rejects.toMatchObject({ error: { code: 'HAS_DEPENDENCIES' } });
    await expect(mockTransport.action('member.invite', { email: 'own@spa.vn', role: 'custom:0190f000-0000-7000-8000-000000009999' })).rejects.toMatchObject({ status: 422 });

    const t = await mockTransport.action<{ team_id: string }>('team.create', { name: 'Nhóm Spa', user_ids: ['u_huyen', 'u_huong'], lead_user_id: 'u_huyen' });
    if (t.status !== 200) throw new Error('team.create');
    expect(issues(teamsSchema, await mockTransport.get('/teams'))).toEqual([]);
    await expect(mockTransport.action('team.set_members', { team_id: t.data.result.team_id, if_version: 1, user_ids: ['u_huong'] })).rejects.toMatchObject({
      error: { fields: { lead_user_id: 'lead_removed' } },
    });
    await expect(mockTransport.action('team.create', { name: 'X', user_ids: ['u_khong_co'] })).rejects.toMatchObject({ status: 422 });
  });
});
