// TIP-026b §3.3–3.4: thẻ hoạt động render từ tóm tắt thật — watcher (can_edit false) không có nút thêm / ô check khoá; check gửi version
// đang hiển thị; bình luận chỉ gửi khi có nội dung. TIP-026c: DealCard = thẻ Sales Pipeline (chi tiết ở OpportunityPanel.test.tsx).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ActivitySummaryDto } from '@appchat/shared';

const state = vi.hoisted(() => ({ toggle: vi.fn(), add: vi.fn(async () => true), open: vi.fn() }));
vi.mock('next-intl', () => ({ useTranslations: () => (k: string, v?: Record<string, unknown>) => (v ? `${k}:${JSON.stringify(v)}` : k) }));
vi.mock('../i18n/useFmt', () => ({ useFmt: () => ({ date: (d: string) => d.slice(0, 10), time: () => '09:00', money: (v: string) => `${v}₫` }) }));
vi.mock('./useActivityActions', () => ({ useActivityActions: () => ({ pendingTask: null, toggleTask: state.toggle, commenting: false, addComment: state.add }) }));
vi.mock('./activity-store', () => ({ useActivityUi: (sel: (s: Record<string, unknown>) => unknown) => sel({ openForm: state.open, openList: vi.fn() }) }));
vi.mock('../opportunities', () => ({ OpportunityPanel: (p: Record<string, unknown>) => <div data-testid="panel">{JSON.stringify({ c: p.contactId, cur: (p.current as { id?: string } | null)?.id ?? null, n: p.total, e: p.canEdit, h: (p.history as unknown[]).length })}</div> }));

import { ActivityCards, DealCard } from './ActivityCards';

const author = { type: 'user' as const, name: 'Trâm' };
const base = (o: Partial<ActivitySummaryDto> = {}): ActivitySummaryDto => ({
  notes: { latest: { id: 'n1', kind: 'note', body: 'Thích gói cuối tuần', author, created_at: '2026-06-02T03:35:00Z', version: 1 }, count: 1 },
  comments: { items: [{ id: 'c1', kind: 'comment', body: 'Gọi lại giúp em', author: { type: 'agent', name: 'AI Agent' }, created_at: '2026-06-02T03:36:00Z', version: 1 }], count: 1, next_cursor: null },
  tasks: { items: [{ id: 't1', title: 'Demo sản phẩm', description: '', due_at: null, assignee: null, state: 'open', completed_at: null, version: 3 }], open: 1, next_cursor: null },
  opportunity: { current: { id: 'o1', contact_id: 'k1', title: 'HIFU', need: '', amount_hidden: true, stage: 'quote', probability: 70, expected_close_date: null, owner: null, source_kind: 'manual', lost_reason: null, items: [], closed_at: null, stage_changed_at: '2026-06-02T03:40:00Z', archived: false, updated_at: '2026-06-02T03:40:00Z', version: 1, quote: null, next_step: null, suggestion: null }, count: 3 },
  can_edit: true,
  ...o,
});

describe('ActivityCards', () => {
  afterEach(cleanup);
  beforeEach(() => {
    state.toggle.mockReset();
    state.add.mockClear();
    state.open.mockReset();
  });

  it('render thật: ghi chú, bình luận agent, việc; check gửi đúng bản ghi (version 3)', () => {
    render(<ActivityCards contactId="k1" a={base()} />);
    expect(screen.getByText('Thích gói cuối tuần')).toBeTruthy();
    expect(screen.getByText('AI Agent')).toBeTruthy();
    fireEvent.click(screen.getByTestId('task-check'));
    expect(state.toggle).toHaveBeenCalledWith(expect.objectContaining({ id: 't1', version: 3 }));
  });

  it('DealCard → thẻ Sales Pipeline: cơ hội hiện hành + tổng + quyền sửa + lịch sử của 360°; chưa có tóm tắt → không render', () => {
    const { unmount } = render(<DealCard contactId="k1" a={base()} history={[]} />);
    expect(JSON.parse(screen.getByTestId('panel').textContent!)).toEqual({ c: 'k1', cur: 'o1', n: 3, e: true, h: 0 });
    unmount();
    const { container } = render(<DealCard contactId="k1" />);
    expect(container.innerHTML).toBe('');
  });

  it('watcher: không nút thêm, ô check khoá, không ô bình luận', () => {
    render(<ActivityCards contactId="k1" a={base({ can_edit: false })} />);
    expect(screen.queryByTestId('task-add')).toBeNull();
    expect(screen.queryByTestId('note-add')).toBeNull();
    expect((screen.getByTestId('task-check') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByTestId('comment-input')).toBeNull();
  });

  it('bình luận: nút gửi khoá khi rỗng; có nội dung → addComment', () => {
    render(<ActivityCards contactId="k1" a={base()} />);
    expect((screen.getByTestId('comment-send') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByTestId('comment-input'), { target: { value: 'Mai gọi' } });
    fireEvent.click(screen.getByTestId('comment-send'));
    expect(state.add).toHaveBeenCalledWith('Mai gọi');
  });

  it('chưa có tóm tắt (API cũ) → không hiện gì', () => {
    const { container } = render(<ActivityCards contactId="k1" />);
    expect(container.innerHTML).toBe('');
  });
});
