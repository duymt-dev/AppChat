// "Gán phụ trách" cho các khách đã chọn (crm.reassign, TIP-026): một người nhận + tuỳ chọn chuyển kèm như Chuyển phụ trách (D32);
// chạy contact.transfer_owner từng khách (mỗi khách một dòng nhật ký, hoàn tác được). TIP-015d: kết quả theo từng khách từ server
// (đã chuyển / đã là người phụ trách / chờ duyệt / lỗi / đã dừng) hiện ngay trong hộp; "Dừng" chỉ dừng giữa các khách.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ModalShell, color } from '@appchat/ui';
import { useContactTransfer } from '../hooks/useContactTransfer';
import { TransferResult } from './TransferResult';
import { useFormStyles } from '../styles/form.styles';
import { useCollabStyles } from '../styles/collab.styles';
import { useCrmUi } from '../crm-store';
import { membersQuery } from '../api';
import type { ContactRow } from '../types';

const MOVE = ['conversations', 'quotes', 'appointments'] as const;

export function BulkTransferModal({ contacts, onDone }: { contacts: ContactRow[]; onDone: () => void }) {
  const t = useTranslations('customers.transfer');
  const { styles: fs, cx } = useFormStyles();
  const { styles } = useCollabStyles();
  const ui = useCrmUi();
  const members = useQuery(membersQuery()).data ?? [];
  const transfer = useContactTransfer();
  const [to, setTo] = useState('');
  const [move, setMove] = useState({ conversations: true, quotes: true, appointments: false });
  const names = new Map(contacts.map((c) => [c.id, c.full_name]));
  const done = transfer.results.length === contacts.length && !transfer.running;
  // Đóng hộp không huỷ thao tác đã gửi lên server — chỉ dừng gửi các khách còn lại.
  const close = () => {
    transfer.cancel();
    if (transfer.results.length) onDone();
    ui.set({ modal: null, target: null });
  };
  // `onDone` (bỏ chọn) chỉ khi đóng hộp — gọi sớm sẽ gỡ hộp trước khi người dùng đọc kết quả.
  const submit = () => transfer.run(contacts.map((c) => ({ contactId: c.id })), to, move);

  return (
    <ModalShell
      open
      onClose={close}
      width={520}
      title={t('bulkTitle', { count: contacts.length })}
      icon="ic-users"
      iconColor={color.violet}
      iconBg={color.fieldsBg}
      closeLabel={t('close')}
      testId="crm-bulk-transfer"
      footer={
        <>
          {transfer.running ? (
            <button type="button" className={fs.btn} onClick={transfer.cancel} data-testid="bulk-transfer-stop">
              {t('stop')}
            </button>
          ) : (
            <button type="button" className={fs.btn} onClick={close}>
              {done ? t('close') : t('cancel')}
            </button>
          )}
          {!done && (
            <button type="button" className={cx(fs.btn, fs.primary)} disabled={!to || transfer.running} onClick={() => void submit()} data-testid="bulk-transfer-submit">
              {t('submit')}
            </button>
          )}
        </>
      }
    >
      <div className={fs.muted}>{contacts.map((c) => c.full_name).join(', ')}</div>
      <div className={styles.label}>{t('to')}</div>
      <select className={fs.input} value={to} aria-label={t('to')} onChange={(e) => setTo(e.target.value)} data-testid="bulk-transfer-to">
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
      <div className={styles.hint}>{t('hint')}</div>
      <TransferResult results={transfer.results} names={names} />
    </ModalShell>
  );
}
