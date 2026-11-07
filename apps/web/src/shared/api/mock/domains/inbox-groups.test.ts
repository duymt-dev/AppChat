// TIP-025b P3 — mock quản lý nhóm đúng shape dùng chung (packages/shared/src/api/inbox-groups.ts) + luật: CAS chính sách (phiên bản cũ →
// 409), hội thoại 1-1 → INVALID_TRANSITION, đổi tên cần đúng phiên bản, thêm thành viên báo từng người.
import { beforeEach, describe, expect, it } from 'vitest';
import { groupCommandSchema, groupStateSchema } from '@appchat/shared';
import { mockTransport } from '../mock-transport';
import { mockDb, setMockRole } from '../store';
import { createInboxState } from './inbox';
import { resetGroupMock } from './inbox-groups';

type Ok<T> = { data: { result: T } };
const code = async (p: Promise<unknown>) => p.then(() => null, (e: { error?: { code: string } }) => e.error?.code ?? 'throw');

describe('mock inbox groups', () => {
  beforeEach(() => {
    setMockRole('owner');
    mockDb().inbox = createInboxState();
    resetGroupMock();
  });

  it('trạng thái nhóm + chính sách CAS; 1-1 → INVALID_TRANSITION', async () => {
    const s = groupStateSchema.parse(await mockTransport.get('/conversations/g_vip/group'));
    expect(s).toMatchObject({ policy: 'mention', policy_version: 0, provider: null });
    const r = (await mockTransport.action('group.set_ai_policy', { conversation_id: 'g_vip', policy: 'off', if_version: 0 })) as Ok<{ policy_version: number }>;
    expect(r.data.result.policy_version).toBe(1);
    expect(await code(mockTransport.action('group.set_ai_policy', { conversation_id: 'g_vip', policy: 'auto', if_version: 0 }))).toBe('CONFLICT');
    expect(await code(mockTransport.action('group.set_ai_policy', { conversation_id: 'c_lan', policy: 'auto', if_version: 0 }))).toBe('INVALID_TRANSITION');
  });

  it('làm mới → ảnh chụp; đổi tên đúng / sai phiên bản; thêm thành viên kết quả từng người', async () => {
    await mockTransport.action('group.refresh', { conversation_id: 'g_vip' });
    const p = groupStateSchema.parse(await mockTransport.get('/conversations/g_vip/group')).provider!;
    expect(await code(mockTransport.action('group.update', { conversation_id: 'g_vip', name: 'X', expected_version: '0' }))).toBe('CONFLICT');
    await mockTransport.action('group.update', { conversation_id: 'g_vip', name: 'VIP 2026', expected_version: p.version });
    expect(groupStateSchema.parse(await mockTransport.get('/conversations/g_vip/group')).provider?.name).toBe('VIP 2026');
    const a = (await mockTransport.action('group.add_members', { conversation_id: 'g_vip', member_conversation_ids: ['c_lan', 'blocked_x'] })) as Ok<{ command_id: string }>;
    const c = groupCommandSchema.parse(await mockTransport.get(`/inbox/group-commands/${a.data.result.command_id}`));
    expect(c.state).toBe('partial');
    expect(c.members?.map((m) => m.status)).toEqual(['confirmed', 'failed']);
  });
});
