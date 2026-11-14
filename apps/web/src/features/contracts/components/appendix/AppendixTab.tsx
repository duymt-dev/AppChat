// Tab "Phụ lục" của drawer hợp đồng (TIP-030b F3 spec 18 — prototype không có màn, bố cục theo thẻ tab sẵn có): danh sách phụ lục (mã PL-n,
// trạng thái, version, giá trị điều chỉnh, bằng chứng ký riêng của từng phụ lục) + thao tác theo trạng thái và quyền — tạo chỉ khi hợp đồng
// đã ký; Owner ký trước (OTP riêng) rồi mới gửi link khách. Mọi ghi qua useAction.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useCan } from '@/shared/authz/useCan';
import { useFmt } from '@/shared/i18n/useFmt';
import { useContractTabStyles } from '../../styles/tabs.styles';
import { useAppendixStyles } from '../../styles/appendix.styles';
import { useAppendices, type AppendixActions } from '../../hooks/useAppendices';
import { AppendixApproval } from './AppendixApproval';
import { AppendixForm } from './AppendixForm';
import type { Appendix, Contract } from '../../types';

function Item({ a, x, onEdit, onApprove }: { a: Appendix; x: AppendixActions; onEdit: () => void; onApprove: () => void }) {
  const t = useTranslations('contracts.appendix');
  const fmt = useFmt();
  const { styles, cx } = useAppendixStyles();
  const canDraft = useCan('contract.draft');
  const canReview = useCan('contract.review');
  const canSign = useCan('contract.sign');
  const [link, setLink] = useState('');
  const delta = a.value_delta === null ? '' : `${a.value_delta.startsWith('-') ? '−' : '+'}${fmt.money(a.value_delta.replace('-', ''))}`;
  const send = async (channel: 'zalo_personal' | 'email') => {
    const r = await x.send.run({ appendix_id: a.id, channel });
    if (r) setLink(r.result.sign_url);
  };
  return (
    <div className={styles.item} data-testid="ct-apx" data-appendix={a.code}>
      <div className={styles.head}>
        <span className={styles.code}>{`${a.code} · ${a.title}`}</span>
        <span className={styles.pill} data-testid="ct-apx-status">
          {t(`status.${a.status}` as never)}
        </span>
      </div>
      <div className={styles.meta}>{[t('version', { v: a.version }), delta ? t('delta', { v: delta }) : '', a.signed_sha256 ? `SHA-256 ${a.signed_sha256.slice(0, 16)}…` : ''].filter(Boolean).join(' · ')}</div>
      {a.declined_reason ? <div className={styles.meta}>{a.declined_reason}</div> : null}
      {a.events.length ? (
        <div className={styles.trail} data-testid="ct-apx-trail">
          {a.events
            .filter((e) => e.version === a.version)
            .map((e) => `${t(`ev.${e.type}` as never)} ${fmt.date(e.at).slice(0, 5)}`)
            .join(' → ')}
        </div>
      ) : null}
      <div className={styles.row}>
        {a.status === 'draft' && canDraft ? (
          <>
            <button type="button" className={styles.btn} onClick={onEdit} data-testid="ct-apx-edit">
              {t('edit')}
            </button>
            <button type="button" className={cx(styles.btn, styles.primary)} disabled={x.submit.isPending} onClick={() => void x.submit.run({ appendix_id: a.id })} data-testid="ct-apx-submit">
              {t('submit')}
            </button>
          </>
        ) : null}
        {a.status === 'pending_approval' && canReview ? (
          <button type="button" className={styles.btn} onClick={() => void x.requestChanges.run({ appendix_id: a.id })} data-testid="ct-apx-changes">
            {t('requestChanges')}
          </button>
        ) : null}
        {a.status === 'pending_approval' && canSign ? (
          <button type="button" className={cx(styles.btn, styles.primary)} onClick={onApprove} data-testid="ct-apx-approve-open">
            {t('approve')}
          </button>
        ) : null}
        {a.status === 'pending_signature' && canSign ? (
          <>
            <button type="button" className={cx(styles.btn, styles.primary)} disabled={x.send.isPending} onClick={() => void send('zalo_personal')} data-testid="ct-apx-send">
              {t(a.sent_channel ? 'resend' : 'send')}
            </button>
            <button type="button" className={styles.btn} disabled={x.send.isPending} onClick={() => void send('email')} data-testid="ct-apx-send-email">
              {t('sendEmail')}
            </button>
          </>
        ) : null}
      </div>
      {link ? (
        <div className={styles.meta} data-testid="ct-apx-link">
          {link}
        </div>
      ) : null}
    </div>
  );
}

export function AppendixTab({ c }: { c: Contract }) {
  const t = useTranslations('contracts.appendix');
  const { styles: tab, cx } = useContractTabStyles();
  const { styles } = useAppendixStyles();
  const canDraft = useCan('contract.draft');
  const x = useAppendices(c.id);
  const [form, setForm] = useState<{ edit: Appendix | null } | null>(null);
  const [approve, setApprove] = useState<Appendix | null>(null);
  return (
    <div className={cx(tab.card)} data-testid="ct-appendices">
      <div className={styles.head}>
        <div className={tab.h}>{t('title')}</div>
        {c.status === 'signed' && canDraft ? (
          <button type="button" className={styles.btn} onClick={() => setForm({ edit: null })} data-testid="ct-apx-new">
            {t('new')}
          </button>
        ) : null}
      </div>
      {!x.loading && !x.items.length ? <div className={styles.empty}>{t(c.status === 'signed' ? 'empty' : 'onlySigned')}</div> : null}
      {x.items.map((a) => (
        <Item key={a.id} a={a} x={x} onEdit={() => setForm({ edit: a })} onApprove={() => setApprove(a)} />
      ))}
      {form ? <AppendixForm contractId={c.id} edit={form.edit} x={x} onClose={() => setForm(null)} /> : null}
      {approve ? <AppendixApproval a={approve} x={x} onClose={() => setApprove(null)} /> : null}
    </div>
  );
}
