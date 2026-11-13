// Drawer "Hồ sơ đề nghị thanh toán 360°" — prototype L5257–5338 (392px, nền xám): đầu (mã, trạng thái, khách) + 5 tab + chân Huỷ (chưa thu).
'use client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { EntityDrawer, Icon, color } from '@appchat/ui';
import { useCan } from '@/shared/authz/useCan';
import { useInvoiceDetailStyles } from '../styles/detail.styles';
import { useInvoicesUi } from '../invoices-store';
import { invoiceQuery } from '../api';
import { StatusChip } from '../columns';
import { avInitial } from '../status';
import { RecordFilesPanel } from '@/shared/commerce-files/RecordFilesPanel';
import { AiTab, CrmTab, HistoryTab, OverviewTab } from './DetailTabs';
import { refundRoom } from './RefundModals';
import type { Invoice, InvoicesMeta } from '../types';

const TABS = ['overview', 'crm', 'ai', 'files', 'history'] as const;

function Header({ i }: { i: Invoice }) {
  const t = useTranslations('invoices.detail');
  const { styles } = useInvoiceDetailStyles();
  const router = useRouter();
  return (
    <>
      <div className={styles.top}>
        <span className={styles.icon}>
          <Icon name="ic-doc" size={24} color={color.white} strokeWidth={1.8} />
        </span>
        <div className={styles.grow}>
          <div className={styles.eyebrow}>{t('eyebrow')}</div>
          <div className={styles.code}>{i.code}</div>
          <div className={styles.stRow}>
            <StatusChip i={i} testId="iv-status" />
          </div>
        </div>
      </div>
      <div className={styles.cust}>
        <span className={styles.av}>{avInitial(i.contact_name)}</span>
        <div className={styles.grow}>
          <div className={styles.name}>{i.contact_name}</div>
          <div className={styles.phone}>{t('by', { name: i.owner_name })}</div>
        </div>
        <button type="button" className={styles.link} onClick={() => router.push('/customers')}>
          {t('profile')}
        </button>
      </div>
    </>
  );
}

function Footer({ i }: { i: Invoice }) {
  const t = useTranslations('invoices.detail');
  const { styles, cx } = useInvoiceDetailStyles();
  const set = useInvoicesUi((s) => s.set);
  const canManage = useCan('invoice.manage');
  const canRefund = useCan('payment.refund_request');
  // Đã có khoản thu → không huỷ thẳng, phải yêu cầu hoàn tiền (COMMERCE §5 — luôn chờ duyệt).
  if (Number(i.paid_amount) > 0) {
    if (!canRefund || refundRoom(i) <= 0) return null;
    return (
      <div className={styles.foot}>
        <button
          type="button"
          className={styles.act}
          onClick={() => set({ refundFor: i.id })}
          data-testid="iv-refund-open"
        >
          {t('refundOpen')}
        </button>
      </div>
    );
  }
  if (!canManage || i.status === 'void') return null;
  return (
    <div className={styles.foot}>
      <button
        type="button"
        className={cx(styles.act, styles.actDanger)}
        onClick={() => set({ voidFor: i.id })}
        data-testid="iv-void-open"
      >
        {t('void')}
      </button>
    </div>
  );
}

export function InvoiceDrawer({ meta }: { meta: InvoicesMeta }) {
  const t = useTranslations('invoices.detail');
  const { styles } = useInvoiceDetailStyles();
  const ui = useInvoicesUi();
  const i = useQuery({ ...invoiceQuery(ui.detail ?? ''), enabled: !!ui.detail }).data;
  return (
    <EntityDrawer
      open={!!ui.detail}
      onClose={() => ui.set({ detail: null, tab: 'overview' })}
      title={i?.code ?? ''}
      closeLabel={t('close')}
      testId="iv-drawer"
      muted
      tabs={TABS.map((k) => ({ key: k, label: t(`tabs.${k}`) }))}
      tab={ui.tab}
      onTab={(k) => ui.set({ tab: k })}
      header={i ? <Header i={i} /> : null}
      footer={i ? <Footer i={i} /> : null}
    >
      <div className={styles.body}>
        {i && ui.tab === 'overview' ? <OverviewTab i={i} /> : null}
        {i && ui.tab === 'crm' ? <CrmTab i={i} meta={meta} /> : null}
        {i && ui.tab === 'ai' ? <AiTab i={i} /> : null}
        {i && ui.tab === 'files' ? <RecordFilesPanel key={i.id} record={{ type: 'invoice', id: i.id }} /> : null}
        {i && ui.tab === 'history' ? <HistoryTab i={i} /> : null}
      </div>
    </EntityDrawer>
  );
}
