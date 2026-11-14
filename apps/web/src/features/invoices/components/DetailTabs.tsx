// 5 tab drawer Đề nghị thanh toán — prototype L5267–5336: Tổng quan (thông tin + thanh toán + VietQR) · CRM · AI · Tệp · Lịch sử.
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useFmt } from '@/shared/i18n/useFmt';
import { EmbeddedRecordAssistant } from '@/shared/assistant/record-intent/RecordDrawerSection';
import { useInvoiceTabStyles } from '../styles/tabs.styles';
import { useInvoicePayStyles } from '../styles/pay.styles';
import { useInvoicesUi } from '../invoices-store';
import { PayProgress, PaymentList, VietQrCard } from './PaySection';
import type { Invoice, InvoicesMeta } from '../types';
import { ChannelSelect, type DocChannel } from '@/shared/forms/ChannelSelect';

const EV_DOT: Record<string, string> = {
  created: color.text4,
  sent: color.blue,
  reminded: color.amberDeep,
  payment: color.brand,
  void: color.dangerDeep,
  refund_requested: color.amberDeep,
  refunded: color.violet,
  refund_rejected: color.text4,
};
const NONE = '—';
const IDS = {
  due: 'iv-due',
  order: 'iv-order',
  amount: 'iv-amount',
  refundPending: 'iv-refund-pending',
  refunded: 'iv-refunded',
} as const;
const DOCS = [
  ['docOrders', '/orders'],
  ['docContracts', '/contracts'],
  ['docQuotes', '/quotes'],
] as const;

export function OverviewTab({ i }: { i: Invoice }) {
  const t = useTranslations('invoices');
  const fmt = useFmt();
  const { styles, cx } = useInvoiceTabStyles();
  const set = useInvoicesUi((s) => s.set);
  const canRecord = useCan('payment.record');
  const canManage = useCan('invoice.manage');
  const send = useAction('invoice.send_payment_qr');
  // Kênh gửi (TIP-032b P2 — thêm Website chat): mặc định Zalo như trước.
  const [channel, setChannel] = useState<DocChannel>('zalo_personal');
  const open = i.status !== 'paid' && i.status !== 'void';
  const kv = (label: string, value: string, opt: { id?: string; green?: boolean } = {}) => (
    <div className={styles.kv}>
      <span>{label}</span>
      <b className={opt.green ? styles.green : undefined} data-testid={opt.id}>
        {value}
      </b>
    </div>
  );
  return (
    <>
      <div className={styles.card}>
        <div className={styles.h}>{t('detail.info')}</div>
        {kv(t('detail.svc'), i.title)}
        {kv(t('detail.at'), fmt.date(i.issued_at))}
        {kv(t('detail.due'), i.due_date ? fmt.date(i.due_date) : NONE, { id: IDS.due })}
        {i.kind === 'full' ? null : kv(t('detail.kind'), t(`kind.${i.kind}`))}
        {i.order_code ? kv(t('detail.order'), i.order_code, { id: IDS.order }) : null}
        {kv(t('detail.total'), fmt.money(i.amount), { id: IDS.amount, green: true })}
        {Number(i.refund_pending) > 0
          ? kv(t('refund.open'), t('refund.pending', { v: fmt.money(i.refund_pending) }), {
              id: IDS.refundPending,
            })
          : null}
        {Number(i.refunded) > 0
          ? kv(t('refund.open'), t('refund.refunded', { v: fmt.money(i.refunded) }), { id: IDS.refunded })
          : null}
        {i.status === 'void' ? (
          <div className={styles.kv}>
            <b className={styles.danger}>{t('detail.voided', { reason: i.void_reason })}</b>
          </div>
        ) : null}
      </div>
      <PayProgress i={i} />
      <div className={styles.btns}>
        <button
          type="button"
          className={cx(styles.btn, styles.btnPrimary)}
          disabled={!open || !canRecord}
          onClick={() => set({ recordFor: i.id })}
          data-testid="iv-record"
        >
          {t('detail.record')}
        </button>
        <button
          type="button"
          className={styles.btn}
          disabled={!open || !canManage}
          onClick={() => void send.run({ invoice_id: i.id, channel, if_version: i.version })}
          data-testid="iv-send"
        >
          {i.status === 'draft' ? t('detail.send') : t('detail.remind')}
        </button>
        <ChannelSelect
          value={channel}
          onChange={setChannel}
          disabled={!open || !canManage}
          testId="iv-send-channel"
        />
      </div>
      <PaymentList i={i} />
      <VietQrCard i={i} />
    </>
  );
}

export function CrmTab({ i, meta }: { i: Invoice; meta: InvoicesMeta }) {
  const t = useTranslations('invoices.detail');
  const fmt = useFmt();
  const router = useRouter();
  const { styles } = useInvoiceTabStyles();
  const { styles: pay } = useInvoicePayStyles();
  const cell = (label: string, value: string, c: string) => (
    <div>
      <div className={styles.gl}>{label}</div>
      <div className={styles.gv} style={{ color: c }}>
        {value}
      </div>
    </div>
  );
  return (
    <>
      <div className={styles.card}>
        <div className={styles.h}>{t('customer')}</div>
        <div className={styles.grid}>
          {cell(t('crmTotal'), String(meta.crm.total), color.text)}
          {cell(t('crmRevenue'), fmt.money(i.paid_amount), color.brandInk)}
          {cell(t('crmOnTime'), meta.crm.on_time, color.text)}
          {cell(t('crmDebt'), fmt.money(meta.crm.debt ?? i.left), color.hotText)}
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.h}>{t('docs')}</div>
        {DOCS.map(([k, route]) => (
          <button key={k} type="button" className={pay.docRow} onClick={() => router.push(route)}>
            <span>{t(k)}</span>
            <span>{t('view')}</span>
          </button>
        ))}
      </div>
    </>
  );
}

export function AiTab({ i }: { i: Invoice }) {
  const t = useTranslations('invoices.detail');
  const { styles } = useInvoiceTabStyles();
  // Việc gợi ý (`ai.acts`) là CHỮ hiển thị — chọn thì trích vào ô việc để người dùng sửa rồi tự Gửi; không bao giờ chạy thẳng (TIP-023g §1.5).
  const choices = [
    { intent: 'inspect' as const, labelKey: 'intent.inspect', task: '' },
    ...i.ai.acts.map((a) => ({
      intent: 'invoice_task' as const,
      labelKey: 'intent.invoice_task',
      label: a,
      task: a,
    })),
  ];
  return (
    <>
      <div className={styles.card}>
        <div className={styles.h}>{t('aiTitle')}</div>
        <div className={styles.insight}>
          <Icon name="ic-spark" size={14} color={color.brandInk} />
          <div>{i.ai.text || t('aiNone')}</div>
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.h}>{t('aiActs')}</div>
        <EmbeddedRecordAssistant
          module="invoices"
          scopeOf={{ module: 'invoices', entity: 'invoice', id: i.id, label: i.code }}
          choices={choices}
          testId="inv-rai"
        />
      </div>
    </>
  );
}

export function HistoryTab({ i }: { i: Invoice }) {
  const t = useTranslations('invoices.detail');
  const fmt = useFmt();
  const { styles } = useInvoiceTabStyles();
  return (
    <div className={styles.tl} data-testid="iv-history">
      {i.events.map((e, n) => {
        const at = `${fmt.date(e.at)} ${fmt.time(e.at)}`;
        const actor = e.actor === 'system' ? t('system') : e.actor;
        return (
          <div key={`${e.type}-${n}`} className={styles.ev}>
            <span className={styles.evDot} style={{ background: EV_DOT[e.type] ?? color.text4 }} />
            <div className={styles.evT}>{t(`ev.${e.type}` as never)}</div>
            <div className={styles.evM}>
              {e.amount
                ? t('evAmount', { at, actor, amount: fmt.money(e.amount) })
                : t('evMeta', { at, actor })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
