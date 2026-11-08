// TIP-033b §4.4: thẻ Liệu trình — trạng thái trung thực (đang tải / lỗi + thử lại / không còn quyền / rỗng thật), dòng gói hiện used /
// total / remaining của server + trạng thái tường minh (hết hạn dù còn buổi), không số tiền; "Tải thêm" chỉ khi còn trang.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { CustomerPackage } from '../types';

const state = vi.hoisted(() => ({ hook: {} as Record<string, unknown>, can: true, start: vi.fn() }));
vi.mock('next-intl', () => ({ useTranslations: () => (k: string, v?: Record<string, unknown>) => (v ? `${k}:${JSON.stringify(v)}` : k) }));
vi.mock('../../i18n/useFmt', () => ({ useFmt: () => ({ date: (d: string) => d.slice(0, 10) }) }));
vi.mock('../hooks/useCustomerPackages', () => ({ useCustomerPackages: () => state.hook }));
vi.mock('../../authz/useCan', () => ({ useCan: () => state.can }));
vi.mock('../../actions/useListExport', () => ({ useListExport: () => ({ start: state.start, busy: false, label: null }) }));

import { CustomerPackagesCard } from './CustomerPackagesCard';

const pkg = (o: Partial<CustomerPackage> = {}): CustomerPackage => ({
  id: 'p1', contact_id: 'k1', product_id: 'pr1', name: 'Gội 10 buổi', total: 10, used: 3, remaining: 7, status: 'active', expires_at: '2026-12-31T00:00:00Z', order_id: null, ...o,
});
const hook = (o: Record<string, unknown>) => {
  state.hook = { state: 'ready', items: [], more: false, loadingMore: false, loadMore: vi.fn(), retry: vi.fn(), ...o };
  return state.hook;
};

describe('CustomerPackagesCard', () => {
  afterEach(cleanup);

  it('ready: used / total / remaining của server, hạn dùng, trạng thái hết hạn hiện rõ dù còn buổi; không tiền', () => {
    hook({ items: [pkg(), pkg({ id: 'p2', status: 'expired', remaining: 4, used: 6 })] });
    render(<CustomerPackagesCard contactId="k1" />);
    expect(screen.getByText('title')).toBeTruthy();
    expect(screen.getAllByText(/usage:/)[0]!.textContent).toContain('"remaining":7');
    expect(screen.getByText('status.expired')).toBeTruthy();
    expect(screen.getByText('remainingNote')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/₫|price/);
    expect(screen.queryByTestId('pk-more')).toBeNull();
  });

  it('còn trang → Tải thêm gọi loadMore; bare bỏ tiêu đề', () => {
    const h = hook({ items: [pkg()], more: true });
    render(<CustomerPackagesCard contactId="k1" bare />);
    expect(screen.queryByText('title')).toBeNull();
    fireEvent.click(screen.getByTestId('pk-more'));
    expect(h.loadMore).toHaveBeenCalled();
  });

  it('lỗi → thử lại; không còn quyền / rỗng / đang tải là trạng thái riêng (không số dư giả)', () => {
    const h = hook({ state: 'error' });
    const { unmount } = render(<CustomerPackagesCard contactId="k1" />);
    fireEvent.click(screen.getByTestId('pk-retry'));
    expect(h.retry).toHaveBeenCalled();
    unmount();
    for (const s of ['denied', 'empty', 'loading']) {
      hook({ state: s });
      const r = render(<CustomerPackagesCard contactId="k1" />);
      expect(screen.getByText(s)).toBeTruthy();
      expect(screen.queryByText(/usage:/)).toBeNull();
      r.unmount();
    }
  });

  it('xuất CSV / Excel (TIP-033b §5.1): gửi package.export đúng khách + định dạng; không crm.export → không nút', () => {
    hook({ items: [pkg()] });
    const { unmount } = render(<CustomerPackagesCard contactId="k1" />);
    fireEvent.click(screen.getByTestId('pk-export-csv'));
    expect(state.start).toHaveBeenCalledWith({ contact_id: 'k1', format: 'csv' });
    unmount();
    state.can = false;
    render(<CustomerPackagesCard contactId="k1" />);
    expect(screen.queryByTestId('pk-export-xlsx')).toBeNull();
    state.can = true;
  });
});
