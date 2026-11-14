// TIP-015b khối "AI ghi nhớ": liệt kê fact (nguồn + ngày), nút xoá chỉ khi người xem sửa được khách (watcher không có nút), bấm xoá gọi
// contact.memory_forget đúng id; tóm tắt chỉ chạy khi bấm (không gọi model lúc mở), `rule` ghi rõ không dùng AI, `retry` báo dữ liệu vừa đổi.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const state = vi.hoisted(() => ({ m: {} as Record<string, unknown> }));
vi.mock('./useContactMemory', () => ({ useContactMemory: () => state.m }));
vi.mock('next-intl', () => ({ useTranslations: () => (k: string, v?: Record<string, unknown>) => (v ? `${k}:${JSON.stringify(v)}` : k) }));
vi.mock('../i18n/useFmt', () => ({ useFmt: () => ({ date: (d: string) => d.slice(0, 10) }) }));

import { MemoryPanel } from './MemoryPanel';

const FACTS = [
  { memory_id: 'm1', fact: 'Dị ứng tinh dầu sả', confidence: 0.9, source: 'agent', updated_at: '2026-10-30T02:00:00Z' },
  { memory_id: 'm2', fact: 'Thích lịch tối', confidence: 0.8, source: 'user', updated_at: '2026-10-28T02:00:00Z' },
];
const forget = vi.fn();
const summarize = vi.fn();
const base = (o: Record<string, unknown> = {}) => ({ data: { items: FACTS, cap: 50, can_edit: true }, loading: false, forget, forgetting: false, summary: null, summarizing: false, summarize, ...o });

describe('MemoryPanel', () => {
  afterEach(cleanup);
  beforeEach(() => {
    forget.mockReset();
    summarize.mockReset();
  });

  it('liệt kê fact + nguồn; xoá gọi đúng memory_id', () => {
    state.m = base();
    render(<MemoryPanel contactId="k1" />);
    expect(screen.getByText('Dị ứng tinh dầu sả')).toBeTruthy();
    expect(screen.getByText('count:{"n":2,"cap":50}')).toBeTruthy();
    expect(screen.getByText(/source\.agent/)).toBeTruthy();
    fireEvent.click(screen.getAllByTestId('p360-memory-forget')[0]!);
    expect(forget).toHaveBeenCalledWith('m1');
  });

  it('watcher (can_edit false) không có nút xoá; rỗng → empty', () => {
    state.m = base({ data: { items: FACTS, cap: 50, can_edit: false } });
    const { unmount } = render(<MemoryPanel contactId="k1" />);
    expect(screen.queryByTestId('p360-memory-forget')).toBeNull();
    unmount();
    state.m = base({ data: { items: [], cap: 50, can_edit: true } });
    render(<MemoryPanel contactId="k1" />);
    expect(screen.getByText('empty')).toBeTruthy();
  });

  it('tóm tắt chỉ chạy khi bấm; rule ghi rõ không AI; retry báo dữ liệu vừa đổi', () => {
    state.m = base();
    const { unmount } = render(<MemoryPanel contactId="k1" />);
    expect(summarize).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('p360-summarize'));
    expect(summarize).toHaveBeenCalledWith(false);
    unmount();
    state.m = base({ summary: { bullets: ['Công nợ: 1.500.000₫'], source: 'rule', status: 'fresh' } });
    const r2 = render(<MemoryPanel contactId="k1" />);
    expect(screen.getByText('byRule')).toBeTruthy();
    fireEvent.click(screen.getByTestId('p360-summarize'));
    expect(summarize).toHaveBeenCalledWith(true);
    r2.unmount();
    state.m = base({ summary: { bullets: [], source: 'model', status: 'retry' } });
    render(<MemoryPanel contactId="k1" />);
    expect(screen.getByText('retry')).toBeTruthy();
  });
});
