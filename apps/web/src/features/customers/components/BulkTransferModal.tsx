// "Gán phụ trách" cho các khách đã chọn (crm.reassign, TIP-026): một người nhận + tuỳ chọn chuyển kèm như Chuyển phụ trách (D32);
// chạy contact.transfer_owner từng khách (mỗi khách một dòng nhật ký, hoàn tác được). Khách đã thuộc người nhận được bỏ qua.
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ModalShell, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useFormStyles } from '../styles/form.styles';
import { useCollabStyles } from '../styles/collab.styles';
import { useCrmUi } from '../crm-store';
import { membersQuery } from '../api';
import type { ContactRow } from '../types';

const MOVE = ['conversations', 'quotes', 'appointments'] as const;

export function BulkTransferModal({ contacts, onDone }: { contacts: ContactRow[]; onDone: () => void }) {
  const t = useTranslations('customers.transfer');
  const { message } = App.useApp();
  const { styles: fs, cx } = useFormStyles();
  const { styles } = useCollabStyles();
  const ui = useCrmUi();
  const members = useQuery(membersQuery()).data ?? [];
  const transfer = useAction('contact.transfer_owner');
  const [to, setTo] = useState('');
  const [move, setMove] = useState({ conversations: true, quotes: true, appointments: false });
  const [busy, setBusy] = useState(false);
  const close = () => ui.set({ modal: null, target: null });
  const submit = async () => {
    setBusy(true);
    let n = 0;
    for (const c of contacts.filter((x) => x.owner_user_id !== to)) if (await transfer.run({ contact_id: c.id, to_user_id: to, move }, { silent: true })) n++;
    setBusy(false);
    void message.success(t('bulkDone', { count: n }));
    onDone();
    close();
  };

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
          <button type="button" className={fs.btn} onClick={close}>
            {t('cancel')}
          </button>
          <button type="button" className={cx(fs.btn, fs.primary)} disabled={!to || busy} onClick={() => void submit()} data-testid="bulk-transfer-submit">
            {t('submit')}
          </button>
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
    </ModalShell>
  );
}
