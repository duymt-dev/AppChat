// TIP-025b (REQ-C09a) — hàng cảm xúc trong menu tin chỉ hiện ở kênh nhận cảm xúc (meta kênh theo manifest); kênh không hỗ trợ (web chat /
// email) không hiện, các mục khác (Trả lời / Sao chép / …) giữ nguyên.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (k: string) => `${ns}.${k}` }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('antd', () => ({ App: { useApp: () => ({ message: { success: vi.fn() } }) } }));
vi.mock('@/shared/actions/useAction', () => ({ useAction: () => ({ run: vi.fn(), isPending: false }) }));
vi.mock('../hooks/useMessageProviderStatus', () => ({ useMessageProviderStatus: () => undefined }));
vi.mock('@/shared/api/client', () => ({
  transport: { get: async () => ({ zalo_personal: { label: 'Zalo', short: 'Z', color: '#000', reactions: true }, webchat: { label: 'Web', short: 'W', color: '#000', reactions: false } }) },
}));

import { useInboxUi } from '../inbox-store';
import { MessageMenu } from './MessageMenu';

const msg = { id: 'm1', kind: 'text', direction: 'in', body: 'hi', menu: true } as never;
const wrap = (ch: 'zalo_personal' | 'webchat') =>
  render(<QueryClientProvider client={new QueryClient()}><MessageMenu convId="c1" channelOf={ch} message={msg} isPinned={false} /></QueryClientProvider>);

describe('MessageMenu — cảm xúc theo kênh', () => {
  afterEach(() => (cleanup(), useInboxUi.getState().closePop()));

  it('Zalo: có hàng cảm xúc', async () => {
    wrap('zalo_personal');
    fireEvent.click(screen.getByTestId('msg-dots'));
    await waitFor(() => expect(screen.getByTestId('chat-menu').querySelectorAll('button[title]').length).toBeGreaterThan(0));
  });

  it('web chat: không có hàng cảm xúc, menu vẫn có các mục khác', async () => {
    wrap('webchat');
    fireEvent.click(screen.getByTestId('msg-dots'));
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.getByTestId('chat-menu').querySelectorAll('button[title]')).toHaveLength(0);
    expect(screen.getAllByRole('menuitem').length).toBeGreaterThan(3);
  });
});
