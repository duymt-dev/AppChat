// Hộp "Huỷ lịch hẹn" — appointment.cancel (lý do bắt buộc — Blueprint §3.4). Xếp chồng trên drawer.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ModalShell, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCalFormStyles } from '../styles/form.styles';
import { useCalendarUi } from '../calendar-store';

export function CancelApptModal() {
  const id = useCalendarUi((s) => s.cancelFor);
  if (!id) return null;
  return <CancelAppt key={id} id={id} />;
}

function CancelAppt({ id }: { id: string }) {
  const t = useTranslations('calendar');
  const { styles, cx } = useCalFormStyles();
  const set = useCalendarUi((s) => s.set);
  const [reason, setReason] = useState('');
  const cancel = useAction('appointment.cancel');
  const close = () => set({ cancelFor: null });
  return (
    <ModalShell
      open
      stacked
      onClose={close}
      width={440}
      title={t('detail.cancel')}
      icon="ic-x"
      iconColor={color.dangerDeep}
      iconBg={color.roseBg}
      closeLabel={t('detail.close')}
      testId="cal-cancel"
      footer={
        <>
          <button type="button" className={styles.btn} onClick={close}>
            {t('form.cancel')}
          </button>
          <button
            type="button"
            className={cx(styles.btn, styles.primary)}
            disabled={!reason.trim()}
            onClick={async () => {
              if (await cancel.run({ appointment_id: id, reason: reason.trim() })) close();
            }}
            data-testid="cal-cancel-ok"
          >
            {t('detail.cancel')}
          </button>
        </>
      }
    >
      <label className={styles.label}>{t('detail.cancelReason')}</label>
      <textarea
        className={cx(styles.input, styles.rtArea)}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        data-testid="cal-cancel-reason"
      />
    </ModalShell>
  );
}
