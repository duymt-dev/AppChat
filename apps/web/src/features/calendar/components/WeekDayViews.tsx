// "Tuần" — prototype L3947 (7 cột T2…CN, ngày hôm nay xanh, CN xám, 6 giờ 09:00–14:00 như prototype, cuộn tới giờ khác).
// "Ngày" — Blueprint §7.2 ViewSwitch(day) + StaffLanes: mỗi KTV một cột trong giờ mở cửa (không có trong prototype — dùng cùng pattern lưới).
'use client';
import { useTranslations } from 'next-intl';
import { color } from '@appchat/ui';
import { useCalGridStyles } from '../styles/grid.styles';
import { addDays, dayOf, weekStart } from '../dates';
import { TimeGrid, type GridCol } from './TimeGrid';
import type { Appointment, CalendarMeta } from '../types';

/** Khung giờ hiển thị của prototype (hours L8584: 09:00 → 14:00). */
const KEYS = { dow: 'dow' } as const;
const WEEK_FROM = 9;
const WEEK_TO = 15;

export function WeekView({ rows, meta, anchor }: { rows: Appointment[]; meta: CalendarMeta; anchor: string }) {
  const t = useTranslations('calendar');
  const { styles } = useCalGridStyles();
  const start = weekStart(anchor);
  const dows = t.raw(KEYS.dow) as string[];
  const cols: GridCol[] = dows.map((d, i) => {
    const date = addDays(start, i);
    const c = date === meta.today ? color.brandDeep : i === 6 ? color.text4 : color.text;
    return {
      key: date,
      date,
      head: (
        <>
          <div className={styles.dow}>{d}</div>
          <div className={styles.date} style={{ color: c }}>
            {Number(date.slice(8))}
          </div>
        </>
      ),
    };
  });
  return (
    <TimeGrid
      testId="cal-week"
      cols={cols}
      rows={rows}
      meta={meta}
      from={WEEK_FROM}
      to={WEEK_TO}
      colOf={(a) => cols.findIndex((c) => c.date === dayOf(a.start_at))}
    />
  );
}

export function DayView({ rows, meta, anchor }: { rows: Appointment[]; meta: CalendarMeta; anchor: string }) {
  const { styles } = useCalGridStyles();
  const cols: GridCol[] = meta.staff.map((s) => ({
    key: s.id,
    date: anchor,
    staff_id: s.id,
    head: (
      <>
        <span className={styles.staffAv} style={{ background: s.color }}>
          {s.initial}
        </span>
        <div className={styles.dow}>{s.name}</div>
      </>
    ),
  }));
  const from = Number(meta.open_hours.start.slice(0, 2));
  const to = Number(meta.open_hours.end.slice(0, 2));
  return (
    <TimeGrid
      testId="cal-day"
      cols={cols}
      rows={rows.filter((a) => dayOf(a.start_at) === anchor)}
      meta={meta}
      from={from}
      to={to}
      colOf={(a) => cols.findIndex((c) => c.staff_id === a.staff_id)}
    />
  );
}
