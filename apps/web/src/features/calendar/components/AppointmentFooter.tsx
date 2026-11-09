// Chân drawer lịch hẹn theo trạng thái (Blueprint §3.4): Đổi giờ + Xác nhận (pending) · Khách đã đến (confirmed) · Hoàn thành (in_progress);
// ⋯ = Không đến / Huỷ; hết giữ chỗ (expired) → ReconfirmAppointment (TIP-033b). Hoàn thành: thuộc liệu trình → trừ 1 buổi; ngoài liệu trình
// → thẻ "Tạo đơn cho buổi này?" (chỉ gợi ý — COMMERCE 8b).
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { ActionMenu, Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useCalDetailStyles } from '../styles/detail.styles';
import { useCalendarUi } from '../calendar-store';
import type { Appointment } from '../types';
import { ReconfirmAppointment } from './ReconfirmAppointment';

export function AppointmentFooter({ a }: { a: Appointment }) {
  const t = useTranslations('calendar.detail');
  const { message } = App.useApp();
  const { styles, cx } = useCalDetailStyles();
  const ui = useCalendarUi();
  const can = useCan('booking.manage');
  const [menu, setMenu] = useState(false);
  const confirm = useAction('appointment.confirm');
  const checkIn = useAction('appointment.check_in');
  const noShow = useAction('appointment.mark_no_show');
  const complete = useAction<{ package: { used: number; total: number } | null; suggest_order: boolean }>(
    'appointment.complete',
  );
  if (can && a.status === 'expired') return <ReconfirmAppointment a={a} />;
  if (!can || !(a.status === 'pending' || a.status === 'confirmed' || a.status === 'in_progress')) return null;
  const finish = async () => {
    const r = await complete.run({ appointment_id: a.id });
    if (!r) return;
    if (r.result.package) void message.success(t('pkgDone', r.result.package));
    if (r.result.suggest_order) ui.set({ suggestFor: a.id });
  };
  const open = a.status === 'pending' || a.status === 'confirmed';
  const primary =
    a.status === 'pending'
      ? { label: t('confirm'), run: () => void confirm.run({ appointment_id: a.id, ...(a.version ? { if_version: a.version } : {}) }), id: 'cal-confirm' }
      : a.status === 'confirmed'
        ? { label: t('checkIn'), run: () => void checkIn.run({ appointment_id: a.id }), id: 'cal-checkin' }
        : { label: t('complete'), run: () => void finish(), id: 'cal-complete' };
  return (
    <div className={styles.foot}>
      {open ? (
        <button
          type="button"
          className={styles.act}
          onClick={() => ui.set({ form: { reschedule: a.id } })}
          data-testid="cal-reschedule"
        >
          <Icon name="ic-doc" size={14} color={color.text3} />
          {t('reschedule')}
        </button>
      ) : null}
      <button type="button" className={cx(styles.act, styles.actPrimary)} onClick={primary.run} data-testid={primary.id}>
        <Icon name="ic-check" size={14} color={color.white} strokeWidth={1.9} />
        {primary.label}
      </button>
      {open ? (
        <ActionMenu
          open={menu}
          onToggle={() => setMenu(!menu)}
          onClose={() => setMenu(false)}
          label={t('more')}
          testId="cal-more"
          items={[
            {
              key: 'noshow',
              label: t('noShow'),
              icon: 'ic-clock',
              onClick: () => (setMenu(false), void noShow.run({ appointment_id: a.id })),
            },
            {
              key: 'cancel',
              label: t('cancel'),
              icon: 'ic-x',
              danger: true,
              onClick: () => (setMenu(false), ui.set({ cancelFor: a.id })),
            },
          ]}
        />
      ) : null}
    </div>
  );
}
