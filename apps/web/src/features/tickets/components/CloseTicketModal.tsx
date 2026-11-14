// Hộp "Đóng ticket" — ticket.close (lý do bắt buộc: Đã giải quyết · Trùng · Khách rút · Ngoài phạm vi — Blueprint §2.2). Xếp chồng trên drawer.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ModalShell, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { usePinnedVersion } from '@/shared/actions/StaleVersionModal';
import { useTkFormStyles } from '../styles/form.styles';
import { useTicketsUi } from '../tickets-store';
import { ticketQuery } from '../api';

const REASONS = ['resolved', 'duplicate', 'withdrawn', 'out_of_scope'] as const;

export function CloseTicketModal() {
  const id = useTicketsUi((s) => s.closeFor);
  const k = useQuery({ ...ticketQuery(id ?? ''), enabled: !!id }).data;
  if (!id || !k?.code) return null;
  return <CloseBox key={id} id={id} code={k.code} version={k.version} />;
}

function CloseBox({ id, code, version }: { id: string; code: string; version?: number }) {
  const t = useTranslations('tickets');
  const { styles, cx } = useTkFormStyles();
  const set = useTicketsUi((s) => s.set);
  const [reason, setReason] = useState<(typeof REASONS)[number] | ''>('');
  const [note, setNote] = useState('');
  const closeT = useAction('ticket.close');
  // TIP-003e: version lúc mở hộp — người khác sửa trước → 409 → hộp xung đột chung, lý do / ghi chú giữ nguyên.
  const ver = usePinnedVersion(version, ticketQuery(id).queryKey);
  const done = () => set({ closeFor: null });
  return (
    <ModalShell
      open
      stacked
      onClose={done}
      width={440}
      title={
        <div>
          <div>{t('closeBox.title', { code })}</div>
          <div className={styles.sub}>{t('closeBox.sub')}</div>
        </div>
      }
      icon="ic-check"
      iconColor={color.brandInk}
      iconBg={color.brandBg}
      closeLabel={t('form.close')}
      testId="tk-close-box"
      footer={
        <>
          <button type="button" className={styles.btn} onClick={done}>
            {t('closeBox.cancel')}
          </button>
          <button
            type="button"
            className={cx(styles.btn, styles.primary)}
            disabled={!reason}
            onClick={async () => {
              if (!reason) return;
              if (await closeT.run({ ticket_id: id, reason, if_version: ver.ifVersion, ...(note.trim() ? { note: note.trim() } : {}) }, { onStaleReload: ver.onStaleReload })) done();
            }}
            data-testid="tk-close-ok"
          >
            {t('closeBox.ok')}
          </button>
        </>
      }
    >
      <div className={styles.body}>
        <div>
          <label className={styles.label}>{t('closeBox.reason')}</label>
          <select
            className={styles.select}
            value={reason}
            onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])}
            data-testid="tk-close-reason"
          >
            <option value="" disabled>
              {t('closeBox.reason')}
            </option>
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {t(`closeBox.reasons.${r}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={styles.label}>{t('closeBox.note')}</label>
          <textarea className={cx(styles.input, styles.rtArea)} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
    </ModalShell>
  );
}
