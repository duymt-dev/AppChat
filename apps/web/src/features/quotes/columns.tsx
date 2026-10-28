// Cột DataTable Báo giá — prototype L4993 (grid 34 92 1.3fr 1.2fr 108 100 84 .9fr 70 .95fr 120 44) + thẻ mobile / kanban.
'use client';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { ActionMenu, Icon, color, type TableColumnsType } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useFmt } from '@/shared/i18n/useFmt';
import { useQuoteCellStyles } from './styles/cells.styles';
import { useQuotesUi } from './quotes-store';
import { STATUS_TONE } from './status';
import type { Quote } from './types';

export function StatusChip({ q }: { q: Quote }) {
  const t = useTranslations('quotes.status');
  const { styles } = useQuoteCellStyles();
  const [fg, bg] = STATUS_TONE[q.status];
  return (
    <span className={styles.status} style={{ color: fg, background: bg }}>
      {t(q.status)}
    </span>
  );
}

/** "Dịch vụ" = dòng đầu + số dòng còn lại (prototype svc). */
export function useSvc() {
  const t = useTranslations('quotes');
  return (q: Quote) =>
    q.items.length > 1
      ? t('more', { name: q.items[0]!.name, n: q.items.length - 1 })
      : (q.items[0]?.name ?? '');
}

/** Ngày giờ kiểu prototype "24/06 · 09:42". */
export function useStamp() {
  const fmt = useFmt();
  return (iso: string) => `${fmt.date(iso).slice(0, 5)} · ${fmt.time(iso)}`;
}

function AiCell({ q }: { q: Quote }) {
  const t = useTranslations('quotes');
  const { message } = App.useApp();
  const { styles, cx } = useQuoteCellStyles();
  const ui = useQuotesUi();
  return (
    <div className={styles.ai} onClick={(e) => e.stopPropagation()}>
      <span className={styles.aiText} title={q.ai.hint}>
        {t('spark', { hint: q.ai.hint })}
      </span>
      {q.ai.wait ? (
        <button
          type="button"
          className={cx(styles.aiDot, styles.aiDo)}
          title={t('aiDo')}
          aria-label={t('aiDo')}
          onClick={() => void message.info(t('aiDoing', { code: q.code }))}
        >
          <Icon name="ic-bolt" size={12} color={color.white} strokeWidth={2} />
        </button>
      ) : null}
      <button
        type="button"
        className={cx(styles.aiDot, styles.aiPeek)}
        title={t('aiPeek')}
        aria-label={t('aiPeek')}
        onClick={() => ui.set({ detail: q.id, tab: 'ai' })}
      >
        <Icon name="ic-spark" size={12} color={color.violet} />
      </button>
    </div>
  );
}

function RowMenu({ q }: { q: Quote }) {
  const t = useTranslations('quotes.menu');
  const ui = useQuotesUi();
  const canApprove = useCan('quote.approve');
  const canCreate = useCan('quote.create');
  const approve = useAction('quote.approve');
  const revision = useAction<{ quote_id: string }>('quote.request_revision');
  const reject = useAction('quote.mark_rejected');
  const del = useAction('quote.delete');
  const close = () => ui.set({ menuFor: null });
  const items = [
    {
      key: 'view',
      label: t('view'),
      icon: 'ic-eye' as const,
      onClick: () => ui.set({ menuFor: null, detail: q.id, tab: 'overview' }),
    },
    ...(canApprove
      ? [
          {
            key: 'approve',
            label: t('approve'),
            icon: 'ic-check' as const,
            onClick: () => (close(), void approve.run({ quote_id: q.id })),
          },
        ]
      : []),
    ...(canCreate
      ? [
          {
            key: 'revision',
            label: t('revision'),
            icon: 'ic-doc' as const,
            onClick: () => (close(), void revision.run({ quote_id: q.id })),
          },
        ]
      : []),
    {
      key: 'reject',
      label: t('reject'),
      icon: 'ic-x' as const,
      onClick: () => (close(), void reject.run({ quote_id: q.id })),
    },
    ...(canCreate
      ? [
          {
            key: 'delete',
            label: t('delete'),
            icon: 'ic-trash' as const,
            danger: true,
            onClick: () => (close(), void del.run({ quote_id: q.id })),
          },
        ]
      : []),
  ];
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <ActionMenu
        open={ui.menuFor === q.id}
        onToggle={() => ui.set({ menuFor: ui.menuFor === q.id ? null : q.id })}
        onClose={close}
        label={t('open')}
        variant="ghost"
        items={items}
      />
    </div>
  );
}

export function useQuoteColumns(): TableColumnsType<Quote> {
  const t = useTranslations('quotes');
  const fmt = useFmt();
  const svc = useSvc();
  const stamp = useStamp();
  const { styles } = useQuoteCellStyles();
  return [
    {
      key: 'code',
      title: t('col.code'),
      width: 92,
      render: (_, q) => (
        <div className={styles.code}>
          <div>{q.code}</div>
          <div className={styles.rev}>{t('rev', { n: q.version })}</div>
        </div>
      ),
    },
    {
      key: 'cust',
      title: t('col.cust'),
      width: 150,
      ellipsis: true,
      render: (_, q) => <span className={styles.cust}>{q.contact_name}</span>,
    },
    {
      key: 'svc',
      title: t('col.svc'),
      width: 140,
      ellipsis: true,
      render: (_, q) => <span className={styles.svc}>{svc(q)}</span>,
    },
    {
      key: 'at',
      title: t('col.at'),
      width: 108,
      render: (_, q) => <span className={styles.muted}>{stamp(q.created_at)}</span>,
    },
    {
      key: 'exp',
      title: t('col.exp'),
      width: 100,
      render: (_, q) => <span className={styles.muted}>{fmt.date(q.valid_until)}</span>,
    },
    {
      key: 'by',
      title: t('col.by'),
      width: 84,
      render: (_, q) => <span className={styles.by}>{q.owner_name}</span>,
    },
    {
      key: 'value',
      title: <span className={styles.end}>{t('col.value')}</span>,
      width: 104,
      render: (_, q) => <span className={styles.value}>{fmt.moneyShort(q.total)}</span>,
    },
    {
      key: 'tax',
      title: t('col.tax'),
      width: 70,
      render: (_, q) => <span className={styles.muted}>{t('pct', { n: q.items[0]?.tax_rate ?? 0 })}</span>,
    },
    { key: 'status', title: t('col.status'), width: 110, render: (_, q) => <StatusChip q={q} /> },
    { key: 'ai', title: t('col.ai'), width: 120, render: (_, q) => <AiCell q={q} /> },
    {
      key: 'act',
      title: <span className={styles.end}>{t('col.act')}</span>,
      width: 44,
      render: (_, q) => <RowMenu q={q} />,
    },
  ];
}

export function QuoteCard({ q }: { q: Quote }) {
  const fmt = useFmt();
  const svc = useSvc();
  const { styles } = useQuoteCellStyles();
  return (
    <>
      <div className={styles.mRow}>
        <span className={styles.code}>{q.code}</span>
        <StatusChip q={q} />
      </div>
      <div className={styles.mRow}>
        <span className={styles.cust}>{q.contact_name}</span>
        <span className={styles.value}>{fmt.moneyShort(q.total)}</span>
      </div>
      <span className={styles.svc}>{svc(q)}</span>
    </>
  );
}

export function QuoteKanbanCard({ q, onOpen }: { q: Quote; onOpen: () => void }) {
  const fmt = useFmt();
  const svc = useSvc();
  const stamp = useStamp();
  const { styles } = useQuoteCellStyles();
  return (
    <div className={styles.kCard} onClick={onOpen} data-quote={q.id}>
      <div className={styles.kTop}>
        <span className={styles.kCode}>{q.code}</span>
        <span className={styles.kVal}>{fmt.moneyShort(q.total)}</span>
      </div>
      <div className={styles.kCust}>{q.contact_name}</div>
      <div className={styles.kSvc}>{svc(q)}</div>
      <div className={styles.kFoot}>
        <span className={styles.kAv}>{q.owner_name}</span>
        {stamp(q.created_at)}
      </div>
    </div>
  );
}
