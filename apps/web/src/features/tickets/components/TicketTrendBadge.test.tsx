// TIP-034d §4.4 / AC7: huy hiệu xu hướng thẻ KPI — không tương tác (không phải nút / không focus được), dấu ↑ / ↓ / = / — kèm lời đọc màn
// hình; tăng KHÔNG mặc định là tốt (quá hạn tăng = đỏ, đã đóng tăng = xanh, tổng trung tính); backend cũ / không có mốc → "—" + "chưa so
// được" (không số 0 giả); vi / en.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { color } from '@appchat/ui';
import vi from '../../../../messages/vi/tickets.json';
import en from '../../../../messages/en/tickets.json';
import { TicketTrendBadge, trendColor, trendOf } from './TicketTrendBadge';
import type { StockMetric, TicketStockSummary } from '../types';

const base = { counts: { total: 10, open: 3, waiting: 2, breach: 4, closed: 5 }, measured_at: '2026-11-14T10:00:00.000+07:00', time_zone: 'Asia/Ho_Chi_Minh', metric_version: 1, cohort: 'current_authorized_surviving' as const };
const OK: TicketStockSummary = {
  ...base,
  comparison: { status: 'available', observed_at: '2026-11-13T09:15:00.000+07:00', local_date: '2026-11-13', prior: { total: 8, open: 4, waiting: 2, breach: 1, closed: 3 }, delta: { total: 2, open: -1, waiting: 0, breach: 3, closed: 2 } },
};
const MISSING: TicketStockSummary = { ...base, comparison: { status: 'unavailable', reason: 'baseline_missing' } };

const show = (summary: TicketStockSummary | undefined, metric: StockMetric, locale: 'vi' | 'en' = 'vi') =>
  render(
    <NextIntlClientProvider locale={locale} messages={{ tickets: locale === 'vi' ? vi : en }}>
      <TicketTrendBadge summary={summary} metric={metric} />
    </NextIntlClientProvider>,
  );

afterEach(cleanup);

describe('TicketTrendBadge', () => {
  it('tăng / giảm / không đổi có dấu + lời đọc; không phải phần tử tương tác', () => {
    show(OK, 'breach');
    const b = screen.getByTestId('tk-trend-breach');
    expect(b.getAttribute('data-sign')).toBe('up');
    expect(b.textContent).toContain('↑ 3');
    expect(b.textContent).toContain('tăng 3 so với hôm qua');
    expect(b.closest('button, a, [tabindex]')).toBeNull();
    cleanup();
    show(OK, 'open');
    expect(screen.getByTestId('tk-trend-open').textContent).toContain('↓ 1');
    expect(screen.getByTestId('tk-trend-open').textContent).toContain('giảm 1 so với hôm qua');
    cleanup();
    show(OK, 'waiting');
    expect(screen.getByTestId('tk-trend-waiting').getAttribute('data-sign')).toBe('flat');
    expect(screen.getByTestId('tk-trend-waiting').textContent).toContain('không đổi so với hôm qua');
  });

  it('không có mốc / backend cũ → "—" + chưa so được, không số 0 giả', () => {
    show(MISSING, 'total');
    const b = screen.getByTestId('tk-trend-total');
    expect(b.getAttribute('data-sign')).toBe('unknown');
    expect(b.textContent).toContain('—');
    expect(b.textContent).toContain('chưa so được với hôm qua');
    expect(b.textContent).not.toMatch(/0/);
    cleanup();
    show(undefined, 'closed');
    expect(screen.getByTestId('tk-trend-closed').getAttribute('data-sign')).toBe('unknown');
  });

  it('màu theo chiều tốt / xấu của từng số (tăng không mặc định tốt)', () => {
    expect(trendColor('breach', 'up')).toBe(color.dangerStrong);
    expect(trendColor('breach', 'down')).toBe(color.okStrong);
    expect(trendColor('closed', 'up')).toBe(color.okStrong);
    expect(trendColor('open', 'up')).toBe(color.dangerStrong);
    expect(trendColor('total', 'up')).toBe(color.text3);
    expect(trendColor('total', 'unknown')).toBe(color.text4);
    expect(trendOf(OK, 'closed')).toEqual({ sign: 'up', delta: 2 });
    expect(trendOf(MISSING, 'closed')).toEqual({ sign: 'unknown', delta: null });
  });

  it('en', () => {
    show(OK, 'closed', 'en');
    expect(screen.getByTestId('tk-trend-closed').textContent).toContain('up 2 from yesterday');
  });
});
