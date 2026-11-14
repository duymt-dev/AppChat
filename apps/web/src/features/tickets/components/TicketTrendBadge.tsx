// Huy hiệu "so với hôm qua" trong thẻ KPI Ticket (TIP-034d §4.4) — KHÔNG tương tác (nằm trong nút lọc của thẻ, không lồng nút). Dấu rõ
// ràng ↑ / ↓ / = và chữ cho trình đọc màn hình; tăng không mặc định là tốt: số quá hạn / đang mở / đang chờ tăng là xấu (đỏ), đã đóng tăng là
// tốt (xanh), tổng trung tính. Không có mốc / backend cũ → "—" kèm lý do đọc được, không bao giờ dựng xu hướng giả.
'use client';
import { useTranslations } from 'next-intl';
import { color } from '@appchat/ui';
import { useTicketsStyles } from '../styles/tickets.styles';
import type { StockMetric, TicketStockSummary } from '../types';

/** Chiều "tốt" của từng số: +1 tăng là tốt, -1 tăng là xấu, 0 trung tính. */
const GOOD_WHEN_UP: Record<StockMetric, -1 | 0 | 1> = { total: 0, open: -1, waiting: -1, breach: -1, closed: 1 };

export type TrendSign = 'up' | 'down' | 'flat' | 'unknown';

export function trendOf(s: TicketStockSummary | undefined, k: StockMetric): { sign: TrendSign; delta: number | null } {
  if (!s || s.comparison.status !== 'available') return { sign: 'unknown', delta: null };
  const d = s.comparison.delta[k];
  return { sign: d > 0 ? 'up' : d < 0 ? 'down' : 'flat', delta: d };
}

export function trendColor(k: StockMetric, sign: TrendSign): string {
  if (sign === 'unknown' || sign === 'flat') return color.text4;
  const good = GOOD_WHEN_UP[k];
  if (good === 0) return color.text3;
  return (sign === 'up') === (good > 0) ? color.okStrong : color.dangerStrong;
}

const MARK: Record<TrendSign, string> = { up: '↑', down: '↓', flat: '=', unknown: '—' };

export function TicketTrendBadge({ summary, metric }: { summary: TicketStockSummary | undefined; metric: StockMetric }) {
  const t = useTranslations('tickets.stock');
  const { styles } = useTicketsStyles();
  const { sign, delta } = trendOf(summary, metric);
  const n = delta === null ? 0 : Math.abs(delta);
  const label = sign === 'unknown' ? t('srUnknown') : sign === 'flat' ? t('srFlat') : t(sign === 'up' ? 'srUp' : 'srDown', { n });
  return (
    <span className={styles.kpiT} style={{ color: trendColor(metric, sign) }} data-testid={`tk-trend-${metric}`} data-sign={sign}>
      <span aria-hidden="true">{sign === 'unknown' || sign === 'flat' ? MARK[sign] : `${MARK[sign]} ${n}`}</span>
      <span className={styles.sr}>{label}</span>
    </span>
  );
}
