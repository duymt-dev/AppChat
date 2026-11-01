// Hoàn tiền (COMMERCE §4–6, TIP-032 — prototype không vẽ, theo khuôn "Huỷ đề nghị" / "Cần đối soát", DV-013): hộp "Yêu cầu hoàn tiền"
// (payment.refund — số ≤ còn hoàn được, để trống = toàn bộ; lý do bắt buộc; luôn chờ duyệt) và thẻ "Hoàn tiền chờ duyệt" cho người có
// `payment.refund_approve` (refund_approve / refund_reject — từ chối cần lý do).
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ModalShell, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useFmt } from '@/shared/i18n/useFmt';
import { useInvoiceFormStyles } from '../styles/form.styles';
import { useInvoiceTabStyles } from '../styles/tabs.styles';
import { useInvoicePayStyles } from '../styles/pay.styles';
import { useInvoicesUi } from '../invoices-store';
import { invoiceQuery } from '../api';
import type { Invoice, RefundRequest } from '../types';

const digits = (v: string) => v.replace(/\D/g, '');
/** Còn hoàn được = đã thu − đã hoàn − đang chờ hoàn (khớp server `invoiceRefundable`). */
export const refundRoom = (i: Invoice) =>
  Math.max(0, Number(i.paid_amount) - Number(i.refunded) - Number(i.refund_pending));

export function RefundRequestModal() {
  const id = useInvoicesUi((s) => s.refundFor);
  const i = useQuery({ ...invoiceQuery(id ?? ''), enabled: !!id }).data;
  if (!id || !i) return null;
  return <RefundRequest key={id} i={i} />;
}

function RefundRequest({ i }: { i: Invoice }) {
  const t = useTranslations('invoices.refund');
  const fmt = useFmt();
  const { styles, cx } = useInvoiceFormStyles();
  const set = useInvoicesUi((s) => s.set);
  const run = useAction('payment.refund');
  const room = refundRoom(i);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const over = Number(amount) > room;
  const close = () => set({ refundFor: null });
  return (
    <ModalShell
      open
      stacked
      onClose={close}
      width={440}
      title={t('title', { code: i.code })}
      icon="ic-refresh"
      iconColor={color.amberText}
      iconBg={color.amberBg}
      closeLabel={t('cancel')}
      testId="iv-refund"
      footer={
        <>
          <button type="button" className={styles.btn} onClick={close}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className={cx(styles.btn, styles.primary)}
            disabled={!reason.trim() || over}
            onClick={async () => {
              if (
                await run.run({
                  invoice_id: i.id,
                  reason: reason.trim(),
                  ...(Number(amount) > 0 ? { amount } : {}),
                })
              )
                close();
            }}
            data-testid="iv-refund-ok"
          >
            {t('send')}
          </button>
        </>
      }
    >
      <div className={styles.hint} data-testid="iv-refund-room">
        {t('room', { v: fmt.money(String(room)) })}
      </div>
      {over ? <div className={styles.err}>{t('over')}</div> : null}
      <label className={styles.label}>{t('amount')}</label>
      <input
        className={styles.input}
        inputMode="numeric"
        value={amount}
        placeholder={t('amountHint')}
        onChange={(e) => setAmount(digits(e.target.value))}
        data-testid="iv-refund-amount"
      />
      <label className={styles.label}>{t('reason')}</label>
      <textarea
        className={cx(styles.input, styles.area)}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        data-testid="iv-refund-reason"
      />
    </ModalShell>
  );
}

/** Thẻ một yêu cầu hoàn chờ duyệt (trong drawer "Cần đối soát"). */
export function RefundCard({ r }: { r: RefundRequest }) {
  const t = useTranslations('invoices.refund');
  const fmt = useFmt();
  const { styles: tab } = useInvoiceTabStyles();
  const { styles, cx } = useInvoiceFormStyles();
  const { styles: pay } = useInvoicePayStyles();
  const approve = useAction('payment.refund_approve');
  const reject = useAction('payment.refund_reject');
  const [note, setNote] = useState('');
  return (
    <div className={tab.card} data-testid={`iv-rf-${r.id}`}>
      <div className={pay.payAmt}>{fmt.money(r.amount)}</div>
      <div className={pay.payMeta}>{r.contact_name}</div>
      <div className={pay.payMeta}>{t('meta', { code: r.invoice_code, by: r.by, at: fmt.date(r.at) })}</div>
      <div className={styles.err}>{r.reason}</div>
      <label className={styles.label}>{t('rejectNote')}</label>
      <input
        className={styles.input}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        data-testid="iv-rf-note"
      />
      <div className={tab.btns}>
        <button
          type="button"
          className={styles.btn}
          disabled={!note.trim()}
          onClick={() => void reject.run({ payment_id: r.id, note: note.trim() })}
          data-testid="iv-rf-reject"
        >
          {t('reject')}
        </button>
        <button
          type="button"
          className={cx(styles.btn, styles.primary)}
          onClick={() =>
            void approve.run({ payment_id: r.id, ...(note.trim() ? { note: note.trim() } : {}) })
          }
          data-testid="iv-rf-approve"
        >
          {t('approve')}
        </button>
      </div>
    </div>
  );
}
