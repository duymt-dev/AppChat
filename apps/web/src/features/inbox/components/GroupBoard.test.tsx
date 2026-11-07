// TIP-025b §A.7 — Bảng tin nhóm đọc thật: tin ghim, ảnh / tệp / link từ /group/board theo loại, "Xem tất cả" tải trang kế; link không
// http(s) không thành href; ghi chú chỉ tải khi mở; không có ô màu giả.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const calls: Record<string, unknown>[] = [];
vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (k: string) => `${ns}.${k}` }));
vi.mock('@/shared/i18n/useFmt', () => ({ useFmt: () => ({ date: () => '24/10' }) }));
const pinned = { message_id: 'p', at: '', sender: 'A', text: 'Lịch họp thứ 2' };
vi.mock('@/shared/api/client', () => ({
  transport: {
    get: async (_: string, p: Record<string, unknown>) => {
      calls.push(p);
      const it = (id: string, o: Record<string, unknown>) => ({ message_id: id, at: '2026-10-24T00:00:00Z', sender: 'A', ...o });
      if (p.kind === 'media') return p.cursor ? { pinned, kind: 'media', items: [it('m2', { name: 'b.png', url: 'https://f/b.png' })], next_cursor: null } : { pinned, kind: 'media', items: [it('m1', { name: 'a.png', url: 'https://f/a.png' })], next_cursor: 'm1' };
      if (p.kind === 'files') return { pinned, kind: 'files', items: [it('f1', { name: 'bao-gia.pdf', mime: 'application/pdf', size: 2048 })], next_cursor: null };
      if (p.kind === 'links') return { pinned, kind: 'links', items: [it('l1', { url: 'https://example.com/menu' }), it('l2', { url: 'javascript:alert(1)' })], next_cursor: null };
      return { pinned, kind: 'notes', items: [it('n1', { text: 'Ghi chú nội bộ' })], next_cursor: null };
    },
  },
}));

import { GroupBoard } from './GroupBoard';

describe('GroupBoard', () => {
  afterEach(() => {
    cleanup();
    calls.length = 0;
  });

  it('ghim + ảnh / tệp / link thật; xem tất cả tải trang kế; link lạ không có href', async () => {
    render(<QueryClientProvider client={new QueryClient()}><GroupBoard convId="g1" /></QueryClientProvider>);
    await waitFor(() => expect(screen.getByTestId('group-pinned').textContent).toBe('Lịch họp thứ 2'));
    await waitFor(() => expect(screen.getByAltText('a.png')).toBeTruthy());
    expect(screen.getByTestId('group-file').textContent).toContain('bao-gia.pdf');
    const links = screen.getAllByTestId('group-link-item');
    expect(links[0]!.getAttribute('href')).toBe('https://example.com/menu');
    expect(links[1]!.getAttribute('href')).toBeNull();
    expect(calls.some((c) => c.kind === 'notes')).toBe(false);
    fireEvent.click(screen.getAllByText('inbox.group.seeAll')[0]!);
    await waitFor(() => expect(screen.getByAltText('b.png')).toBeTruthy());
    fireEvent.click(screen.getByTestId('group-notes'));
    await waitFor(() => expect(screen.getByText('Ghi chú nội bộ')).toBeTruthy());
  });
});
