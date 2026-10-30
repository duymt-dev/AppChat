// TIP-013: route mock Cài đặt đúng shape đọc dùng chung với API thật (packages/shared/src/api/settings.ts).
import { beforeEach, describe, expect, it } from 'vitest';
import type { z } from 'zod';
import { membersPageSchema, settingsRolesSchema, slaSettingsSchema, workspaceSettingsSchema } from '@appchat/shared';
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
});
