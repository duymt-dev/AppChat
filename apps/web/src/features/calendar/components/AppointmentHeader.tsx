// Đầu drawer lịch hẹn — prototype L4187–4195: nhãn trạng thái · dịch vụ (chấm màu) · giờ + thời lượng.
'use client';
import { useTranslations } from 'next-intl';
import { useCalDetailStyles } from '../styles/detail.styles';
import { STATUS_TONE } from '../status';
import { hmOf, minOf } from '../dates';
import type { Appointment, CalendarMeta } from '../types';

export function AppointmentHeader({ a, meta }: { a: Appointment; meta: CalendarMeta }) {
  const t = useTranslations('calendar');
  const { styles } = useCalDetailStyles();
  const sv = meta.services.find((s) => s.id === a.service_id)!;
  const [fg, bg] = STATUS_TONE[a.status];
  return (
    <div className={styles.head}>
      <div className={styles.stRow}>
        <span className={styles.st} style={{ color: fg, background: bg }} data-testid="cal-status">
          {t(`status.${a.status}`)}
        </span>
      </div>
      <div className={styles.svc}>
        <span className={styles.dot} style={{ background: sv.color }} />
        <div className={styles.svcN}>{sv.name}</div>
      </div>
      <div className={styles.time} data-testid="cal-time">
        {t('detail.time', {
          time: `${hmOf(a.start_at)}`,
          dur: t('list.dur', { n: minOf(a.end_at) - minOf(a.start_at) }),
        })}
      </div>
    </div>
  );
}
