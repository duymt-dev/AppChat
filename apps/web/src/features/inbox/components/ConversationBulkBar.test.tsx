// TIP-025b P1 (Q-019) — thanh hàng loạt: ẩn khi chưa chọn; Gán chỉ hiện với inbox.assign; mỗi nút một lệnh với đúng id đã chọn; bảng kết
// quả: tổng + danh sách lỗi (hội thoại không có trong danh sách hiện → không lộ tên), > 50 → "đã nhận, chạy nền".
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

let can = true;
vi.mock('@/shared/authz/useCan', () => ({ useCan: () => can }));
vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (k: string, v?: Record<string, unknown>) => `${ns}.${k}${v ? JSON.stringify(v) : ''}` }));
vi.mock('@/features/customers', () => ({ membersQuery: () => ({ queryKey: ['m'], queryFn: async () => [{ id: 'u1', name: 'Lan' }] }) }));
vi.mock('../api', () => ({ tagsQuery: () => ({ queryKey: ['t'], queryFn: async () => [{ id: 't1', name: 'VIP', emoji: null }] }) }));

import { ConversationBulkBar } from './ConversationBulkBar';
import { BulkResultPanel } from './BulkResultPanel';
import type { InboxSelection } from '../hooks/useInboxSelection';

const wrap = (n: ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{n}</QueryClientProvider>);
const sel = (ids: string[]): InboxSelection => ({ ids, count: ids.length, active: ids.length > 0, has: (x) => ids.includes(x), toggle: vi.fn(), selectVisible: vi.fn(), clear: vi.fn() });

describe('ConversationBulkBar', () => {
  afterEach(() => {
    cleanup();
    can = true;
  });

  it('chưa chọn → không hiện', () => {
    const { container } = wrap(<ConversationBulkBar selection={sel([])} visibleIds={[]} pending={false} onRun={vi.fn()} />);
    expect(container.textContent).toBe('');
  });

  it('đóng / lưu trữ gửi đúng id; chọn hiện tại gọi selectVisible', () => {
    const onRun = vi.fn();
    const s = sel(['a', 'b']);
    wrap(<ConversationBulkBar selection={s} visibleIds={['a', 'b', 'c']} pending={false} onRun={onRun} />);
    expect(screen.getByTestId('inbox-bulk-count').textContent).toBe('inbox.bulk.selected{"n":2}');
    fireEvent.click(screen.getByTestId('inbox-bulk-close'));
    fireEvent.click(screen.getByTestId('inbox-bulk-archive'));
    expect(onRun.mock.calls.map((c) => c[0])).toEqual([{ ids: ['a', 'b'], op: 'close' }, { ids: ['a', 'b'], op: 'archive' }]);
    fireEvent.click(screen.getByTestId('inbox-bulk-all'));
    expect(s.selectVisible).toHaveBeenCalledWith(['a', 'b', 'c']);
  });

  it('không có inbox.assign → không có Gán; đang chạy → nút khoá', () => {
    can = false;
    wrap(<ConversationBulkBar selection={sel(['a'])} visibleIds={['a']} pending onRun={vi.fn()} />);
    expect(screen.queryByTestId('inbox-bulk-assign')).toBeNull();
    expect((screen.getByTestId('inbox-bulk-close') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('BulkResultPanel', () => {
  afterEach(cleanup);

  it('tổng + lỗi từng hội thoại; hội thoại không có tên → nhãn ẩn', () => {
    const items = [
      { id: 'a', status: 'done' as const, error: null },
      { id: 'b', status: 'skipped' as const, error: null },
      { id: 'x', status: 'failed' as const, error: 'NOT_FOUND:conversation_id' },
    ];
    render(<BulkResultPanel outcome={{ updated: 1, failed: 1, items }} titles={new Map([['a', 'Lan']])} onClose={vi.fn()} />);
    expect(screen.getByTestId('inbox-bulk-result').textContent).toContain('inbox.bulk.summary{"done":1,"skipped":1,"failed":1}');
    expect(screen.getByTestId('inbox-bulk-failed').textContent).toBe('inbox.bulk.hidden — errors.NOT_FOUND');
  });

  it('việc nền → đã nhận, không báo xong', () => {
    render(<BulkResultPanel outcome={{ updated: 0, failed: 0, items: [], jobId: 'j1' }} titles={new Map()} onClose={vi.fn()} />);
    expect(screen.getByTestId('inbox-bulk-result').textContent).toContain('inbox.bulk.jobAccepted');
  });
});
