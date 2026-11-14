// Chi tiết "so với hôm qua" của 5 thẻ KPI Ticket (TIP-034d §4.4) — nút riêng NGOÀI các nút lọc của thẻ (không lồng nút), mở một vùng giải
// thích: giờ đo của số hiện tại (số có thể đã cache — không gọi là "ngay lúc này"), giờ quan sát thật của mốc hôm qua, giới hạn tập so sánh
// (chỉ ticket bạn còn thấy hiện nay — không phải tăng trưởng ròng, không nói lý do), hoặc vì sao chưa so được. Không vẽ biểu đồ từ hai điểm.
'use client';
import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { STOCK_METRICS } from '@appchat/shared';
import { useTicketsStyles } from '../styles/tickets.styles';
import type { TicketStockSummary } from '../types';

/** ISO kèm offset (giờ workspace) → "HH:mm dd/MM" theo đúng giờ ghi trong chuỗi — không đổi sang múi giờ trình duyệt. */
export const wallTime = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  return m ? `${m[4]}:${m[5]} ${m[3]}/${m[2]}` : iso;
};

export function TicketTrendDetails({ summary }: { summary: TicketStockSummary | undefined }) {
  const t = useTranslations('tickets.stock');
  const tk = useTranslations('tickets.kpi');
  const { styles } = useTicketsStyles();
  const [open, setOpen] = useState(false);
  const id = useId();
  const c = summary?.comparison;
  return (
    <div className={styles.stockWrap}>
      <button type="button" className={styles.stockBtn} aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)} data-testid="tk-stock-details">
        <Icon name="ic-clock" size={13} color={color.text3} />
        {!summary ? t('unknownShort') : c?.status === 'available' ? t('vsYesterday', { at: wallTime(c.observed_at) }) : t('noBaselineShort')}
      </button>
      {open ? (
        <div id={id} role="region" aria-label={t('title')} className={styles.stockPanel} data-testid="tk-stock-panel">
          {!summary ? (
            <p>{t('unsupported')}</p>
          ) : (
            <>
              <p>{t('measuredAt', { at: wallTime(summary.measured_at), tz: summary.time_zone })}</p>
              {c?.status === 'available' ? (
                <>
                  <p>{t('observedAt', { at: wallTime(c.observed_at) })}</p>
                  <ul className={styles.stockList}>
                    {STOCK_METRICS.map((k) => (
                      <li key={k} data-testid={`tk-stock-row-${k}`}>
                        {t('row', { label: tk(k), prior: c.prior[k], now: summary.counts[k], delta: c.delta[k] > 0 ? `+${c.delta[k]}` : String(c.delta[k]) })}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p data-testid="tk-stock-reason">{t(`reason.${c!.reason}`)}</p>
              )}
              <p className={styles.stockNote}>{t('cohort')}</p>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
