// TIP-025b §A.6 — Sao chép link tham gia: chỉ khi bấm (cử chỉ người dùng) mới gọi group.copy_link; thăm dò lệnh → link bật thì ghi
// clipboard + báo thành công, link tắt → báo tắt (không ghi clipboard); không quyền → nút tắt có lý do; URL không nằm trong DOM.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { GroupStateDto } from '@appchat/shared';

const runs: unknown[] = [];
const toast = { success: vi.fn(), info: vi.fn(), error: vi.fn() };
let link: { enabled: boolean; url: string | null };
vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (k: string) => `${ns}.${k}` }));
vi.mock('antd', () => ({ App: { useApp: () => ({ message: toast }) } }));
vi.mock('@/shared/actions/useAction', () => ({ useAction: () => ({ run: async (i: unknown) => (runs.push(i), { result: { command_id: 'cmd1', status: 'queued' } }), isPending: false }) }));
vi.mock('@/shared/api/client', () => ({ transport: { get: async () => ({ id: 'cmd1', kind: 'link', conversation_id: 'g1', state: 'confirmed', error: null, link, created_at: '', finished_at: '' }) } }));

import { GroupLinkRow } from './GroupLinkRow';

const state = (over: Partial<GroupStateDto> = {}): GroupStateDto => ({
  conversation_id: 'g1', policy: 'mention', policy_version: 1, observed_members: 3,
  provider: { name: 'N', total: 3, complete: true, account_role: 'admin', link_enabled: true, muted: false, version: '1', fetched_at: '' },
  supports: { refresh: true, add_members: true, update: true, set_mute: true, link: true }, can_manage: true, pending: [], ...over,
});
const wrap = (s: GroupStateDto) => render(<QueryClientProvider client={new QueryClient()}><GroupLinkRow convId="g1" state={s} onManage={vi.fn()} /></QueryClientProvider>);
const writeText = vi.fn(async () => undefined);
Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

describe('GroupLinkRow', () => {
  afterEach(() => {
    cleanup();
    runs.length = 0;
    vi.clearAllMocks();
  });

  it('chưa bấm → không gọi; bấm → group.copy_link → clipboard + báo thành công; URL không vào DOM', async () => {
    link = { enabled: true, url: 'https://zalo.me/g/secret' };
    const { container } = wrap(state());
    expect(runs).toHaveLength(0);
    fireEvent.click(screen.getByTestId('group-link-copy'));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('https://zalo.me/g/secret'));
    expect(runs).toEqual([{ conversation_id: 'g1' }]);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('inbox.group.linkCopied'));
    expect(container.innerHTML).not.toContain('zalo.me');
  });

  it('link tắt → báo tắt, không ghi clipboard', async () => {
    link = { enabled: false, url: null };
    wrap(state());
    fireEvent.click(screen.getByTestId('group-link-copy'));
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith('inbox.group.linkOff'));
    expect(writeText).not.toHaveBeenCalled();
  });

  it('không quyền quản lý → nút tắt kèm lý do', () => {
    wrap(state({ can_manage: false }));
    const b = screen.getByTestId('group-link-copy') as HTMLButtonElement;
    expect(b.disabled).toBe(true);
    expect(b.title).toBe('inbox.group.linkNoPerm');
  });
});
