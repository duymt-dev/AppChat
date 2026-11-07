// TIP-025b §F.2 — tự dịch tin vào: tắt → không gọi; bật → tối đa 10 tin khách (mới nhất trước), tuần tự, sang tiếng Việt; làm mới luồng
// không dịch lại; "Dịch thêm" mở 10 tin kế; lỗi → dừng hàng đợi, Thử lại chạy tiếp; tin ghi chú / của mình / đã thu hồi không dịch.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

const calls: string[] = [];
let failOnce = false;
vi.mock('@/shared/actions/useAction', () => ({
  useAction: () => ({
    run: async (i: { message_id: string; to: string }) => {
      calls.push(`${i.message_id}:${i.to}`);
      if (failOnce) return ((failOnce = false), null);
      return { result: { text: `[VI] ${i.message_id}` } };
    },
  }),
}));

import { useIncomingTranslations } from './useIncomingTranslations';
import type { Message } from '../types';

const msgs: Message[] = [
  ...Array.from({ length: 14 }, (_, i) => ({ id: `m${i}`, kind: 'text', direction: 'in', body: `hello ${i}` }) as Message),
  { id: 'out', kind: 'text', direction: 'out', body: 'mine' } as Message,
  { id: 'note', kind: 'note', body: 'internal' } as Message,
  { id: 'rc', kind: 'text', direction: 'in', body: 'x', recalled: true } as Message,
];

describe('useIncomingTranslations', () => {
  afterEach(() => {
    calls.length = 0;
    failOnce = false;
  });

  it('tắt → không gọi model', async () => {
    renderHook(() => useIncomingTranslations('c1', msgs, false));
    await new Promise((r) => setTimeout(r, 20));
    expect(calls).toEqual([]);
  });

  it('bật → 10 tin khách mới nhất, đích vi; làm mới không dịch lại; Dịch thêm → 4 tin còn lại', async () => {
    const h = renderHook(({ m }) => useIncomingTranslations('c1', m, true), { initialProps: { m: msgs } });
    await waitFor(() => expect(calls).toHaveLength(10));
    expect(calls[0]).toBe('m13:vi');
    expect(calls).not.toContain('out:vi');
    expect(h.result.current.more).toBe(true);
    h.rerender({ m: [...msgs] });
    await new Promise((r) => setTimeout(r, 20));
    expect(calls).toHaveLength(10);
    act(() => h.result.current.loadMore());
    await waitFor(() => expect(calls).toHaveLength(14));
    expect(h.result.current.texts.m0).toBe('[VI] m0');
    expect(calls.filter((c) => /^(note|rc)/.test(c))).toEqual([]);
  });

  it('lỗi → dừng hàng đợi; Thử lại chạy tiếp', async () => {
    failOnce = true;
    const h = renderHook(() => useIncomingTranslations('c2', msgs, true));
    await waitFor(() => expect(h.result.current.paused).toBe(true));
    expect(calls).toHaveLength(1);
    act(() => h.result.current.retry());
    await waitFor(() => expect(calls).toHaveLength(11));
    expect(h.result.current.texts.m13).toBe('[VI] m13');
  });
});
