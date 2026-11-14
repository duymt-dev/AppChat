// TIP-034d §4.4 / §4.7 / AC7: chi tiết "so với hôm qua" — nút riêng (focus được, aria-expanded), mở vùng: giờ đo hiện tại + giờ quan sát
// thật của mốc (theo giờ workspace ghi trong chuỗi, không đổi sang giờ trình duyệt), năm dòng trước → nay, lời nhắc tập so sánh hiện tại;
// không có mốc → lý do; backend cũ → "chưa hỗ trợ"; vi / en.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import vi from '../../../../messages/vi/tickets.json';
import en from '../../../../messages/en/tickets.json';
import { TicketTrendDetails, wallTime } from './TicketTrendDetails';
import type { TicketStockSummary } from '../types';

const base = { counts: { total: 10, open: 3, waiting: 2, breach: 4, closed: 5 }, measured_at: '2026-11-14T00:05:00.000+07:00', time_zone: 'Asia/Ho_Chi_Minh', metric_version: 1, cohort: 'current_authorized_surviving' as const };
const OK: TicketStockSummary = {
  ...base,
  comparison: { status: 'available', observed_at: '2026-11-13T09:15:00.000+07:00', local_date: '2026-11-13', prior: { total: 8, open: 4, waiting: 2, breach: 1, closed: 3 }, delta: { total: 2, open: -1, waiting: 0, breach: 3, closed: 2 } },
};

const show = (summary: TicketStockSummary | undefined, locale: 'vi' | 'en' = 'vi') =>
  render(
    <NextIntlClientProvider locale={locale} messages={{ tickets: locale === 'vi' ? vi : en }}>
      <TicketTrendDetails summary={summary} />
    </NextIntlClientProvider>,
  );

afterEach(cleanup);

describe('TicketTrendDetails', () => {
  it('nút riêng mở / đóng vùng chi tiết; giờ đo + giờ quan sát theo giờ workspace; năm dòng trước → nay; nhắc tập hiện tại', () => {
    show(OK);
    const btn = screen.getByTestId('tk-stock-details');
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.textContent).toContain('So với hôm qua lúc 09:15 13/11');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    const p = screen.getByTestId('tk-stock-panel');
    expect(p.textContent).toContain('Số hiện tại đo lúc 00:05 14/11 (Asia/Ho_Chi_Minh).');
    expect(p.textContent).toContain('quan sát thật lúc 09:15 13/11');
    expect(screen.getByTestId('tk-stock-row-breach').textContent).toContain('Quá hạn SLA: 1 → 4 (+3)');
    expect(screen.getByTestId('tk-stock-row-open').textContent).toContain('Đang mở: 4 → 3 (-1)');
    expect(p.textContent).toContain('không phải tăng trưởng ròng');
    expect(p.querySelector('button')).toBeNull();
    fireEvent.click(btn);
    expect(screen.queryByTestId('tk-stock-panel')).toBeNull();
  });

  it('không có mốc → lý do, không dòng số; backend cũ → chưa hỗ trợ', () => {
    show({ ...base, comparison: { status: 'unavailable', reason: 'baseline_missing' } });
    expect(screen.getByTestId('tk-stock-details').textContent).toContain('Chưa có số hôm qua để so');
    fireEvent.click(screen.getByTestId('tk-stock-details'));
    expect(screen.getByTestId('tk-stock-reason').textContent).toContain('Chưa có lần quan sát nào của hôm qua');
    expect(screen.queryByTestId('tk-stock-row-total')).toBeNull();
    cleanup();
    show(undefined);
    fireEvent.click(screen.getByTestId('tk-stock-details'));
    expect(screen.getByTestId('tk-stock-panel').textContent).toContain('Máy chủ chưa hỗ trợ so sánh với hôm qua.');
  });

  it('giờ hiển thị đúng giờ ghi trong chuỗi (không đổi múi giờ); en', () => {
    expect(wallTime('2026-11-13T23:59:00.000+07:00')).toBe('23:59 13/11');
    show(OK, 'en');
    expect(screen.getByTestId('tk-stock-details').textContent).toContain('Compared with yesterday at 09:15 13/11');
  });
});
