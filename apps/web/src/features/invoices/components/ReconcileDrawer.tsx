// Hàng "Cần đối soát" (COMMERCE §5): giao dịch SePay / Casso khớp không chắc chắn (thiếu mã TT, sai số tiền) → người chọn đề nghị → invoice.resolve_bank_match.
// Chỉ vai trò có `payment.record` (Chủ sở hữu, Quản lý, Kế toán) thấy hàng này — mock lọc theo quyền ở /invoices/meta. Phía trên là
// hoàn tiền chờ duyệt (`payment.refund_approve` — TIP-032).
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { EntityDrawer } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useFmt } from '@/shared/i18n/useFmt';
import { useInvoiceTabStyles } from '../styles/tabs.styles';
import { useInvoiceFormStyles } from '../styles/form.styles';
import { useInvoicePayStyles } from '../styles/pay.styles';
import { useInvoicesUi } from '../invoices-store';
import { invoicesQuery } from '../api';
import { RefundCard } from './RefundModals';
import type { BankTx, InvoicesMeta } from '../types';

function TxCard({ tx }: { tx: BankTx }) {
  const t = useTranslations('invoices');
  const fmt = useFmt();
  const { styles: tab } = useInvoiceTabStyles();
  const { styles, cx } = useInvoiceFormStyles();
  const { styles: pay } = useInvoicePayStyles();
  const open = (useQuery(invoicesQuery('')).data?.data ?? []).filter(
    (i) => i.status !== 'paid' && i.status !== 'void',
  );
  const [pick, setPick] = useState(tx.suggested_invoice_id);
  const resolve = useAction('invoice.resolve_bank_match');
  return (
    <div className={tab.card} data-testid={`iv-tx-${tx.id}`}>
      <div className={pay.payAmt}>{fmt.money(tx.amount)}</div>
      <div className={pay.payMeta}>{tx.content}</div>
      <div className={pay.payMeta}>
        {t('reconcile.meta', {
          at: `${fmt.date(tx.occurred_at)} ${fmt.time(tx.occurred_at)}`,
          provider: tx.provider,
        })}
      </div>
      <div className={styles.err}>{t(`reconcile.reason.${tx.reason}` as never)}</div>
      <label className={styles.label}>{t('reconcile.pick')}</label>
      <div className={tab.btns}>
        <select
          className={cx(styles.input, styles.select)}
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          aria-label={t('reconcile.pick')}
          data-testid="iv-tx-pick"
        >
          {open.map((i) => (
            <option key={i.id} value={i.id}>
              {`${i.code} · ${i.contact_name} · ${fmt.money(i.left)}`}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={cx(styles.btn, styles.primary)}
          disabled={!pick}
          onClick={() => void resolve.run({ bank_tx_id: tx.id, invoice_id: pick })}
          data-testid="iv-tx-match"
        >
          {t('reconcile.match')}
        </button>
      </div>
    </div>
  );
}

export function ReconcileDrawer({ meta }: { meta: InvoicesMeta }) {
  const t = useTranslations('invoices.reconcile');
  const tr = useTranslations('invoices.refund');
  const { styles: pay } = useInvoicePayStyles();
  const { styles: tab } = useInvoiceTabStyles();
  const ui = useInvoicesUi();
  return (
    <EntityDrawer
      open={ui.reconcileOpen}
      onClose={() => ui.set({ reconcileOpen: false })}
      title={t('title')}
      subtitle={t('hint')}
      icon="ic-bell"
      closeLabel={t('close')}
      testId="iv-reconcile"
      muted
    >
      {meta.refunds.length ? (
        <div className={tab.card} data-testid="iv-refund-queue">
          <div className={tab.h}>{tr('queue', { n: meta.refunds.length })}</div>
          <div className={pay.payMeta}>{tr('queueHint')}</div>
        </div>
      ) : null}
      {meta.refunds.map((r) => (
        <RefundCard key={r.id} r={r} />
      ))}
      {meta.bank_txs.length || meta.refunds.length ? null : (
        <div className={tab.card}>
          <div className={pay.empty}>{t('empty')}</div>
        </div>
      )}
      {meta.bank_txs.map((tx) => (
        <TxCard key={tx.id} tx={tx} />
      ))}
    </EntityDrawer>
  );
}
