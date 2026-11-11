// Cột DataTable Đơn hàng — prototype L5521 (grid 30 110 1.3fr 1.4fr .9fr .9fr 1fr .9fr 120 44) + thẻ mobile / kanban.
// 2 trục (COMMERCE §4): cột Thanh toán = pay_status, cột Trạng thái = tiến độ đơn. Đơn sàn có badge nguồn (D31).
'use client';
import { useTranslations } from 'next-intl';
import { ActionMenu, Icon, color, type TableColumnsType } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useFmt } from '@/shared/i18n/useFmt';
import { useOrderCellStyles } from './styles/cells.styles';
import { useOrdersUi } from './orders-store';
import { useRecordScopes } from '@/shared/assistant/record-intent/store';
import { PAY_TONE, STATUS_TONE, avColor, avInitial } from './status';
import type { Order } from './types';
import { useCustomColumns } from '@/shared/custom-fields';

export function StatusChip({ o }: { o: Order }) {
  const t = useTranslations('orders.status');
  const { styles } = useOrderCellStyles();
  const [fg, bg] = STATUS_TONE[o.status];
  return (
    <span className={styles.status} style={{ color: fg, background: bg }}>
      {t(o.status)}
    </span>
  );
}

export function PayText({ o }: { o: Order }) {
  const t = useTranslations('orders.pay');
  const { styles } = useOrderCellStyles();
  return (
    <span className={styles.pay} style={{ color: PAY_TONE[o.pay_status] }}>
      {t(o.pay_status)}
    </span>
  );
}

export function SourceBadge({ o }: { o: Order }) {
  const t = useTranslations('orders');
  const { styles } = useOrderCellStyles();
  if (o.source !== 'marketplace' || !o.external) return null;
  return (
    <span className={styles.src} data-testid="od-src">
      {t(`platform.${o.external.platform}` as never)}
    </span>
  );
}

/** Giá trị kiểu prototype "12,8tr". */
export function useTr() {
  const t = useTranslations('orders');
  const fmt = useFmt();
  return (v: string) => t('tr', { n: fmt.number(Number(v) / 1_000_000) });
}

export function useSvc() {
  const t = useTranslations('orders');
  return (o: Order) =>
    o.items.length > 1
      ? t('more', { name: o.items[0]!.name, n: o.items.length - 1 })
      : (o.items[0]?.name ?? '');
}

export function Avatar({ name, small, className }: { name: string; small?: boolean; className?: string }) {
  const { styles, cx } = useOrderCellStyles();
  return (
    <span className={cx(styles.av, small && styles.kAv, className)} style={{ background: avColor(name) }}>
      {avInitial(name)}
    </span>
  );
}

function AiCell({ o }: { o: Order }) {
  const t = useTranslations('orders');
  const { styles } = useOrderCellStyles();
  const set = useOrdersUi((s) => s.set);
  return (
    <div className={styles.ai} onClick={(e) => e.stopPropagation()}>
      <span className={styles.aiText} title={o.ai.hint}>
        {t('spark', { hint: o.ai.hint })}
      </span>
      {o.ai.wait ? (
        <button
          type="button"
          className={styles.aiDo}
          title={t('aiDo')}
          aria-label={t('aiDo')}
          onClick={() => {
            useRecordScopes.getState().open({ module: 'orders', entity: 'order', id: o.id, label: o.code });
            set({ aiOpen: true });
          }}
        >
          <Icon name="ic-bolt" size={12} color={color.white} strokeWidth={2} />
        </button>
      ) : null}
      <button
        type="button"
        className={styles.aiPeek}
        title={t('aiPeek')}
        aria-label={t('aiPeek')}
        onClick={() => set({ detail: o.id, tab: 'ai' })}
      >
        <Icon name="ic-spark" size={12} color={color.violet} />
      </button>
    </div>
  );
}

function RowMenu({ o }: { o: Order }) {
  const t = useTranslations('orders.menu');
  const ui = useOrdersUi();
  const canManage = useCan('order.manage');
  const canCancel = useCan('order.cancel');
  const confirm = useAction('order.confirm');
  const close = () => ui.set({ menuFor: null });
  const items = [
    {
      key: 'view',
      label: t('view'),
      icon: 'ic-eye' as const,
      onClick: () => ui.set({ menuFor: null, detail: o.id, tab: 'overview' }),
    },
    ...(canManage && o.status === 'new'
      ? [
          {
            key: 'confirm',
            label: t('confirm'),
            icon: 'ic-check' as const,
            iconColor: color.brandInk,
            onClick: () => (close(), void confirm.run({ order_id: o.id })),
          },
        ]
      : []),
    ...(canCancel && (o.status === 'new' || o.status === 'processing')
      ? [
          {
            key: 'cancel',
            label: t('cancel'),
            icon: 'ic-x' as const,
            danger: true,
            onClick: () => ui.set({ menuFor: null, cancelFor: o.id }),
          },
        ]
      : []),
  ];
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <ActionMenu
        open={ui.menuFor === o.id}
        onToggle={() => ui.set({ menuFor: ui.menuFor === o.id ? null : o.id })}
        onClose={close}
        label={t('open')}
        variant="ghost"
        items={items}
      />
    </div>
  );
}

export function useOrderColumns(): TableColumnsType<Order> {
  const t = useTranslations('orders');
  const tr = useTr();
  const svc = useSvc();
  const { styles } = useOrderCellStyles();
  const custom = useCustomColumns<Order>('order');
  return [
    {
      key: 'code',
      title: t('col.code'),
      width: 110,
      render: (_, o) => (
        <span className={styles.code}>
          {o.code}
          <SourceBadge o={o} />
        </span>
      ),
    },
    {
      key: 'cust',
      title: t('col.cust'),
      width: 170,
      render: (_, o) => (
        <div className={styles.custCell}>
          <Avatar name={o.contact_name} />
          <span className={styles.cust}>{o.contact_name}</span>
        </div>
      ),
    },
    {
      key: 'svc',
      title: t('col.svc'),
      width: 180,
      ellipsis: true,
      render: (_, o) => <span className={styles.svc}>{svc(o)}</span>,
    },
    {
      key: 'value',
      title: <span className={styles.end}>{t('col.value')}</span>,
      width: 110,
      render: (_, o) => <span className={styles.value}>{tr(o.total)}</span>,
    },
    {
      key: 'by',
      title: t('col.by'),
      width: 110,
      render: (_, o) => <span className={styles.by}>{o.owner_name}</span>,
    },
    { key: 'pay', title: t('col.pay'), width: 130, render: (_, o) => <PayText o={o} /> },
    { key: 'status', title: t('col.status'), width: 110, render: (_, o) => <StatusChip o={o} /> },
    { key: 'ai', title: t('col.ai'), width: 140, render: (_, o) => <AiCell o={o} /> },
    ...custom,
    {
      key: 'act',
      title: <span className={styles.end}>{t('col.act')}</span>,
      width: 44,
      render: (_, o) => <RowMenu o={o} />,
    },
  ];
}

export function OrderCard({ o }: { o: Order }) {
  const tr = useTr();
  const svc = useSvc();
  const { styles } = useOrderCellStyles();
  return (
    <>
      <div className={styles.mRow}>
        <span className={styles.code}>
          {o.code}
          <SourceBadge o={o} />
        </span>
        <StatusChip o={o} />
      </div>
      <div className={styles.mRow}>
        <span className={styles.cust}>{o.contact_name}</span>
        <span className={styles.value}>{tr(o.total)}</span>
      </div>
      <div className={styles.mRow}>
        <span className={styles.svc}>{svc(o)}</span>
        <PayText o={o} />
      </div>
    </>
  );
}

export function OrderKanbanCard({ o, onOpen }: { o: Order; onOpen: () => void }) {
  const tr = useTr();
  const svc = useSvc();
  const { styles } = useOrderCellStyles();
  return (
    <div className={styles.kCard} onClick={onOpen} data-order={o.id}>
      <div className={styles.kRow}>
        <span className={styles.kCode}>{o.code}</span>
        <SourceBadge o={o} />
      </div>
      <div className={styles.kRow}>
        <Avatar name={o.contact_name} small />
        <span className={styles.cust}>{o.contact_name}</span>
      </div>
      <div className={styles.kSvc}>{svc(o)}</div>
      <div className={styles.kVal}>{tr(o.total)}</div>
    </div>
  );
}
