// TIP-025b §A.4 — Thông tin nhóm: nút Tắt thông báo / Thêm / Quản lý chỉ hiện khi có quyền quản lý + kênh hỗ trợ (người chỉ đọc chỉ thấy
// Ghim); Ghim = conversation.pin của AppChat; Tắt thông báo = group.set_mute cho tài khoản; chính sách AI ghi qua group.set_ai_policy kèm
// phiên bản (không giữ state cục bộ); link tham gia chỉ báo bật / tắt, không có URL trong DOM.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { GroupStateDto } from '@appchat/shared';

const runs: [string, unknown][] = [];
let state: GroupStateDto;
vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (k: string) => `${ns}.${k}` }));
vi.mock('antd', () => ({ App: { useApp: () => ({ message: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }) } }));
vi.mock('@/shared/i18n/useFmt', () => ({ useFmt: () => ({ date: () => '' }) }));
vi.mock('@/shared/actions/useAction', () => ({
  useAction: (id: string) => ({ run: async (i: unknown) => (runs.push([id, i]), { result: { command_id: 'cmd1', status: 'queued', policy: 'off', policy_version: 1 } }), isPending: false }),
}));
vi.mock('@/shared/api/client', () => ({
  transport: {
    get: async (path: string) => {
      if (path.endsWith('/group')) return state;
      if (path.endsWith('/group/board')) return { pinned: null, kind: 'media', items: [], next_cursor: null };
      if (path.startsWith('/groups/')) return { members_total: 3, members_hint: '', members: [], pinned_sub: '', media: [], files: [], links: [], join_link: 'https://zalo.me/g/secret', unanswered: 0, ai_policy: 'mention' };
      return null;
    },
  },
}));

import { GroupInfoPanel } from './GroupInfoPanel';

const conv = { id: 'g1', title: 'Nhóm VIP', kind: 'group', initials: 'NV', hue: '#000', more: '+2', more_hue: '#111', pinned: false } as never;
const base = (over: Partial<GroupStateDto>): GroupStateDto => ({
  conversation_id: 'g1', policy: 'mention', policy_version: 4, observed_members: 3,
  provider: { name: 'Nhóm VIP', total: 3, complete: true, account_role: 'admin', link_enabled: true, muted: false, version: '7', fetched_at: '2026-11-07T00:00:00Z' },
  supports: { refresh: true, add_members: true, update: true, set_mute: true, link: true }, can_manage: true, pending: [], ...over,
});
const wrap = () => render(<QueryClientProvider client={new QueryClient()}><GroupInfoPanel conv={conv} /></QueryClientProvider>);

describe('GroupInfoPanel', () => {
  afterEach(() => {
    cleanup();
    runs.length = 0;
  });

  it('người chỉ đọc: chỉ có Ghim; không có URL link trong DOM', async () => {
    state = base({ can_manage: false });
    const { container } = wrap();
    await waitFor(() => expect(screen.getByTestId('group-act-pin')).toBeTruthy());
    expect(screen.queryByTestId('group-act-mute')).toBeNull();
    expect(screen.queryByTestId('group-act-manage')).toBeNull();
    expect(container.innerHTML).not.toContain('zalo.me');
  });

  it('quản lý: Tắt thông báo → group.set_mute; Ghim → conversation.pin; chính sách → group.set_ai_policy kèm phiên bản', async () => {
    state = base({});
    wrap();
    await waitFor(() => expect(screen.getByTestId('group-act-mute')).toBeTruthy());
    fireEvent.click(screen.getByTestId('group-act-mute'));
    fireEvent.click(screen.getByTestId('group-act-pin'));
    fireEvent.click(screen.getByText('inbox.group.ai.title'));
    fireEvent.click(screen.getByTestId('group-ai-off'));
    await waitFor(() => expect(runs.map((r) => r[0])).toEqual(['group.set_mute', 'conversation.pin', 'group.set_ai_policy']));
    expect(runs[0]![1]).toEqual({ conversation_id: 'g1', muted: true });
    expect(runs[2]![1]).toEqual({ conversation_id: 'g1', policy: 'off', if_version: 4 });
  });
});
