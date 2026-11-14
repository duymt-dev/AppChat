// Hộp "Ghi nhận thanh toán" (invoice.record_payment — xác nhận tay, COMMERCE §5: QR · chuyển khoản · tiền mặt · thẻ; ≤ còn phải thu; sinh phiếu thu)
// và "Huỷ đề nghị" (invoice.void — lý do bắt buộc, chỉ khi chưa có khoản thu). Cả hai xếp chồng trên drawer.
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ModalShell, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { usePinnedVersion } from '@/shared/actions/StaleVersionModal';
import { useFmt } from '@/shared/i18n/useFmt';
import { useInvoiceFormStyles } from '../styles/form.styles';
import { useInvoicesUi } from '../invoices-store';
import { invoiceQuery } from '../api';
import type { Invoice, PayMethod } from '../types';
import { useToday } from '@/shared/time/today';

const METHODS: PayMethod[] = ['bank_transfer', 'cash', 'qr', 'card'];
const digits = (v: string) => v.replace(/\D/g, '');

export function RecordPaymentModal() {
  const id = useInvoicesUi((s) => s.recordFor);
  const i = useQuery({ ...invoiceQuery(id ?? ''), enabled: !!id }).data;
  if (!id || !i) return null;
  return <RecordPayment key={id} i={i} />;
}

function RecordPayment({ i }: { i: Invoice }) {
  const t = useTranslations('invoices.record');
  const today = useToday();
  const tm = useTranslations('invoices.method');
  const fmt = useFmt();
  const { message } = App.useApp();
  const { styles, cx } = useInvoiceFormStyles();
  const set = useInvoicesUi((s) => s.set);
  const record = useAction<{ receipt_code: string }>('invoice.record_payment');
  const [amount, setAmount] = useState(i.left);
  const [method, setMethod] = useState<PayMethod>('bank_transfer');
  const [ref, setRef] = useState('');
  const [date, setDate] = useState(today);
  const [err, setErr] = useState('');
  const close = () => set({ recordFor: null });
  const save = async () => {
    if (!(Number(amount) > 0)) return setErr(t('required'));
    if (Number(amount) > Number(i.left)) return setErr(t('over'));
    const res = await record.run(
      { invoice_id: i.id, amount, method, paid_at: date, ...(ref.trim() ? { reference: ref.trim() } : {}) },
      { silent: true },
    );
    if (!res) return;
    void message.success(t('done', { receipt: res.result.receipt_code }));
    close();
  };
  return (
    <ModalShell
      open
      stacked
      onClose={close}
      width={480}
      title={t('title', { code: i.code })}
      icon="ic-check"
      iconColor={color.brandDeep}
      iconBg={color.brandBg}
      closeLabel={t('cancel')}
      testId="iv-record-box"
      footer={
        <>
          <button type="button" className={styles.btn} onClick={close}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className={cx(styles.btn, styles.primary)}
            onClick={() => void save()}
            data-testid="iv-record-ok"
          >
            {t('save')}
          </button>
        </>
      }
    >
      <div className={styles.hint} data-testid="iv-record-left">
        {t('left', { v: fmt.money(i.left) })}
      </div>
      {err ? (
        <div className={styles.err} data-testid="iv-record-err">
          {err}
        </div>
      ) : null}
      <div className={styles.grid}>
        <div className={styles.field}>
          <label className={styles.label}>{t('amount')}</label>
          <input
            className={styles.input}
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(digits(e.target.value))}
            data-testid="iv-record-amount"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>{t('method')}</label>
          <select
            className={cx(styles.input, styles.select)}
            value={method}
            onChange={(e) => setMethod(e.target.value as PayMethod)}
            data-testid="iv-record-method"
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {tm(m)}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>{t('ref')}</label>
          <input className={styles.input} value={ref} onChange={(e) => setRef(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>{t('date')}</label>
          <input
            type="date"
            className={styles.input}
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>
    </ModalShell>
  );
}

export function VoidInvoiceModal() {
  const id = useInvoicesUi((s) => s.voidFor);
  const i = useQuery({ ...invoiceQuery(id ?? ''), enabled: !!id }).data;
  if (!id || !i) return null;
  return <VoidInvoice key={id} i={i} />;
}

function VoidInvoice({ i }: { i: Invoice }) {
  const t = useTranslations('invoices');
  const { styles, cx } = useInvoiceFormStyles();
  const set = useInvoicesUi((s) => s.set);
  const [reason, setReason] = useState('');
  const run = useAction('invoice.void');
  // TIP-003e: version lúc mở hộp huỷ — đổi trong lúc nhập lý do → 409 → hộp xung đột chung, lý do giữ nguyên.
  const ver = usePinnedVersion(i.version, invoiceQuery(i.id).queryKey);
  const close = () => set({ voidFor: null });
  return (
    <ModalShell
      open
      stacked
      onClose={close}
      width={440}
      title={`${t('detail.void')} · ${i.code}`}
      icon="ic-x"
      iconColor={color.dangerDeep}
      iconBg={color.roseBg}
      closeLabel={t('detail.close')}
      testId="iv-void"
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
              if (await run.run({ invoice_id: i.id, reason: reason.trim(), if_version: ver.ifVersion }, { onStaleReload: ver.onStaleReload })) close();
            }}
            data-testid="iv-void-ok"
          >
            {t('detail.void')}
          </button>
        </>
      }
    >
      <label className={styles.label}>{t('detail.voidReason')}</label>
      <textarea
        className={cx(styles.input, styles.area)}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        data-testid="iv-void-reason"
      />
    </ModalShell>
  );
}
