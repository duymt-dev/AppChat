// D32 "Chuyển phụ trách" (chỉ crm.reassign): chọn người nhận + tuỳ chọn chuyển kèm hội thoại / báo giá / lịch hẹn; ghi timeline.
// TIP-025b §D.3: nhận ngữ cảnh tối thiểu `{ id, owner_user_id, owner_name? }` (danh sách hoặc edit-context của host toàn cục) — tên
// người phụ trách ẩn → hiện "không xem được", không bịa.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ModalShell, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useFormStyles } from '../styles/form.styles';
import { useCollabStyles } from '../styles/collab.styles';
import { useCrmUi } from '../crm-store';
import { membersQuery } from '../api';

/** Ngữ cảnh chuyển phụ trách tối thiểu (TIP-025b §D.3). */
export interface TransferTarget {
  id: string;
  owner_user_id: string | null;
  owner_name?: string | null;
}

const MOVE = ['conversations', 'quotes', 'appointments'] as const;

export function TransferOwnerModal({ contact, toUserId, onClose }: { contact: TransferTarget; toUserId?: string; onClose?: () => void }) {
  const t = useTranslations('customers.transfer');
  const { styles: fs, cx } = useFormStyles();
  const { styles } = useCollabStyles();
  const ui = useCrmUi();
  const members = (useQuery(membersQuery()).data ?? []).filter((m) => m.id !== contact.owner_user_id);
  const transfer = useAction('contact.transfer_owner');
  // Mở từ ô "Phụ trách" của form sửa → điền sẵn người nhận.
  const [to, setTo] = useState(toUserId ?? ui.prefill?.to_user_id ?? '');
  const [note, setNote] = useState('');
  const [move, setMove] = useState({ conversations: true, quotes: true, appointments: false });
  const close = onClose ?? (() => ui.set({ modal: null, target: null }));
  const submit = async () => {
    if (await transfer.run({ contact_id: contact.id, to_user_id: to, move, ...(note ? { note } : {}) })) close();
  };

  return (
    <ModalShell
      open
      onClose={close}
      width={520}
      title={t('title')}
      icon="ic-arrow"
      iconColor={color.violet}
      iconBg={color.fieldsBg}
      closeLabel={t('close')}
      testId="crm-transfer"
      footer={
        <>
          <button type="button" className={fs.btn} onClick={close}>
            {t('cancel')}
          </button>
          <button type="button" className={cx(fs.btn, fs.primary)} disabled={!to} onClick={() => void submit()} data-testid="transfer-submit">
            {t('submit')}
          </button>
        </>
      }
    >
      <div className={fs.muted}>{t('from', { name: contact.owner_name ?? t('hidden') })}</div>
      <div className={styles.label}>{t('to')}</div>
      <select className={fs.input} value={to} aria-label={t('to')} onChange={(e) => setTo(e.target.value)} data-testid="transfer-to">
        <option value="" />
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <div className={styles.label}>{t('move')}</div>
      <div className={styles.checks}>
        {MOVE.map((k) => (
          <label key={k} className={styles.check}>
            <input type="checkbox" checked={move[k]} onChange={(e) => setMove({ ...move, [k]: e.target.checked })} />
            {t(k)}
          </label>
        ))}
      </div>
      <div className={styles.label}>{t('note')}</div>
      <textarea className={cx(fs.input, fs.area)} value={note} aria-label={t('note')} onChange={(e) => setNote(e.target.value)} />
      <div className={styles.hint}>{t('hint')}</div>
    </ModalShell>
  );
}
