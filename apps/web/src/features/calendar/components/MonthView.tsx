// "Tháng" — prototype L3970–3992: tiêu đề tháng + ‹ ›, hàng thứ, lưới 7 cột; mỗi ngày tối đa 2 lịch + "+n lịch nữa"; hôm nay nền xanh.
// Bấm một ngày → chế độ "Ngày" của ngày đó.
'use client';
import { useTranslations } from 'next-intl';
import { color } from '@appchat/ui';
import { useCalGridStyles } from '../styles/grid.styles';
import { useCalendarUi } from '../calendar-store';
import { addDays, addMonths, dayOf, daysInMonth, dowMon, hmOf, monthStart } from '../dates';
import type { Appointment, CalendarMeta } from '../types';

const ARROWS = ['‹', '›'] as const;
const KEYS = { dow: 'dow' } as const;

export function MonthView({ rows, meta, anchor }: { rows: Appointment[]; meta: CalendarMeta; anchor: string }) {
  const t = useTranslations('calendar');
  const { styles } = useCalGridStyles();
  const set = useCalendarUi((s) => s.set);
  const start = monthStart(anchor);
  const lead = dowMon(start);
  const n = daysInMonth(start);
  const cells = [...Array<null>(lead).fill(null), ...Array.from({ length: n }, (_, i) => addDays(start, i))];
  while (cells.length % 7) cells.push(null);
  const live = rows.filter((a) => a.status !== 'cancelled');
  return (
    <div className={styles.card} data-testid="cal-month">
      <div className={styles.mHead}>
        <div className={styles.mTitle} data-testid="cal-month-title">
          {t('month', { m: Number(start.slice(5, 7)), y: start.slice(0, 4) })}
        </div>
        <span className={styles.grow} />
        <div className={styles.nav}>
          <button
            type="button"
            className={styles.navBtn}
            aria-label={t('prev')}
            onClick={() => set({ anchor: addMonths(start, -1) })}
          >
            {ARROWS[0]}
          </button>
          <button
            type="button"
            className={styles.navBtn}
            aria-label={t('next')}
            onClick={() => set({ anchor: addMonths(start, 1) })}
            data-testid="cal-month-next"
          >
            {ARROWS[1]}
          </button>
        </div>
      </div>
      <div className={styles.mDows}>
        {(t.raw(KEYS.dow) as string[]).map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className={styles.mGrid}>
        {cells.map((d, i) => {
          if (!d) return <div key={`b${i}`} className={styles.mCell} />;
          const evs = live.filter((a) => dayOf(a.start_at) === d);
          const today = d === meta.today;
          return (
            <div
              key={d}
              className={styles.mCell}
              style={{ background: today ? color.brandBg : color.surface }}
              onClick={() => set({ view: 'day', anchor: d })}
              data-day={d}
            >
              <div className={styles.mDay} style={{ color: today ? color.brandInk : color.text2 }}>
                {Number(d.slice(8))}
              </div>
              <div className={styles.mEvs}>
                {evs.slice(0, 2).map((a) => {
                  const c = meta.services.find((s) => s.id === a.service_id)!.color;
                  return (
                    <div key={a.id} className={styles.mEv} style={{ background: `${c}14`, borderLeftColor: c }}>
                      <span className={styles.mEvT} style={{ color: c }}>
                        {hmOf(a.start_at)}
                      </span>
                      <span className={styles.mEvN}>{a.contact_name.split(' ').slice(-2).join(' ')}</span>
                    </div>
                  );
                })}
                {evs.length > 2 ? <div className={styles.more}>{t('more', { n: evs.length - 2 })}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
