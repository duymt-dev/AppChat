// Lưới giờ dùng chung cho "Tuần" (7 cột ngày — prototype L3947–3966) và "Ngày" (cột theo KTV — Blueprint §7.2 StaffLanes).
// Khối lịch đặt tuyệt đối theo phút bắt đầu / thời lượng; bấm ô trống → mở form tạo lịch điền sẵn ngày, giờ, KTV.
'use client';
import type { ReactNode } from 'react';
import { toHm } from '@appchat/shared';
import { useCalGridStyles, HOUR_PX } from '../styles/grid.styles';
import { useCalendarUi } from '../calendar-store';
import { hmOf, minOf } from '../dates';
import type { Appointment, CalendarMeta } from '../types';

export interface GridCol {
  key: string;
  head: ReactNode;
  /** Ngày + KTV của ô để điền sẵn form. */
  date: string;
  staff_id?: string;
}

const GUTTER = 56;

export function TimeGrid(p: {
  cols: GridCol[];
  rows: Appointment[];
  meta: CalendarMeta;
  /** Cột của một lịch (index trong `cols`), -1 = không hiện. */
  colOf: (a: Appointment) => number;
  from: number;
  to: number;
  testId: string;
}) {
  const { styles } = useCalGridStyles();
  const set = useCalendarUi((s) => s.set);
  const n = p.cols.length;
  const tpl = `${GUTTER}px repeat(${n}, 1fr)`;
  const hours = Array.from({ length: p.to - p.from }, (_, i) => p.from + i);
  const pick = (c: GridCol, h: number) =>
    set({ form: 'create', prefill: { date: c.date, start: toHm(h * 60), ...(c.staff_id ? { staff_id: c.staff_id } : {}) } });
  return (
    <div className={styles.card} data-testid={p.testId}>
      <div className={styles.scroll}>
        <div>
          <div className={styles.head} style={{ gridTemplateColumns: tpl }}>
            <div className={styles.corner} />
            {p.cols.map((c) => (
              <div key={c.key} className={styles.col}>
                {c.head}
              </div>
            ))}
          </div>
          <div className={styles.body}>
            {hours.map((h) => (
              <div key={h} className={styles.hour} style={{ gridTemplateColumns: tpl }}>
                <div className={styles.hourL}>{toHm(h * 60)}</div>
                {p.cols.map((c) => (
                  <div key={c.key} className={styles.cell} onClick={() => pick(c, h)} />
                ))}
              </div>
            ))}
            {p.rows.map((a) => {
              const i = p.colOf(a);
              const top = ((minOf(a.start_at) - p.from * 60) / 60) * HOUR_PX + 6;
              const h = ((minOf(a.end_at) - minOf(a.start_at)) / 60) * HOUR_PX - 12;
              if (i < 0 || top < 0 || minOf(a.start_at) >= p.to * 60) return null;
              const sv = p.meta.services.find((s) => s.id === a.service_id)!;
              const st = p.meta.staff.find((s) => s.id === a.staff_id)!;
              const first = a.contact_name.split(' ').slice(-2).join(' ');
              return (
                <div
                  key={a.id}
                  className={styles.ev}
                  data-appt={a.id}
                  onClick={() => set({ detail: a.id })}
                  style={{
                    // vị trí / màu theo dữ liệu (giờ, dịch vụ) — giá trị động
                    top,
                    height: Math.max(h, 28),
                    left: `calc(${GUTTER}px + (100% - ${GUTTER}px) * ${i} / ${n} + 4px)`,
                    width: `calc((100% - ${GUTTER}px) / ${n} - 8px)`,
                    background: `${sv.color}1F`,
                    borderLeft: `3px solid ${sv.color}`,
                    opacity: a.status === 'cancelled' ? 0.5 : 1,
                  }}
                >
                  <div className={styles.evT}>{`${first} · ${sv.name.split(' ').slice(0, 2).join(' ')}`}</div>
                  <div className={styles.evS}>{`${hmOf(a.start_at)} · ${st.name}`}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
