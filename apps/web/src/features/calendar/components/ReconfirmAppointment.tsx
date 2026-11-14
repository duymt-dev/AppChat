// Lịch hết giữ chỗ (TIP-033b §1.1): xác nhận lại đúng khung cũ — cùng mã, không đổi giờ / KTV / gói; khung đã bị chiếm → SLOT_TAKEN, giờ
// đã qua / KTV ngừng / gói hết chỗ → báo lý do (server quyết, FE chỉ hiện). Đổi giờ / khách đã đến không mở từ expired; huỷ vẫn được.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCalDetailStyles } from '../styles/detail.styles';
import { useCalendarUi } from '../calendar-store';
import type { Appointment } from '../types';

export function ReconfirmAppointment({ a }: { a: Appointment }) {
  const t = useTranslations('calendar.detail');
  const { styles, cx } = useCalDetailStyles();
  const ui = useCalendarUi();
  const confirm = useAction('appointment.confirm');
  const reconfirm = () => void confirm.run({ appointment_id: a.id, ...(a.version ? { if_version: a.version } : {}) });
  return (
    <div className={cx(styles.foot, styles.footWrap)}>
      <div className={styles.reHint} data-testid="cal-expired-hint">
        {t('expiredHint')}
      </div>
      <button type="button" className={styles.act} onClick={() => ui.set({ cancelFor: a.id })} data-testid="cal-expired-cancel">
        <Icon name="ic-x" size={14} color={color.text3} />
        {t('cancel')}
      </button>
      <button
        type="button"
        className={cx(styles.act, styles.actPrimary)}
        onClick={reconfirm}
        disabled={confirm.isPending}
        data-testid="cal-reconfirm"
      >
        <Icon name="ic-check" size={14} color={color.white} strokeWidth={1.9} />
        {t('reconfirm')}
      </button>
    </div>
  );
}
