// Cột DataTable Hợp đồng — prototype L5376 (grid 30 100 1.2fr 1.4fr .9fr 96 .9fr .8fr 150 100 .9fr 150 44) + thẻ mobile / kanban.
// Menu dòng: Duyệt = mở hộp "Duyệt & ký" (OTP + chữ ký, COMMERCE §9); Yêu cầu sửa / Từ chối chỉ với hợp đồng chờ duyệt.
'use client';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { ActionMenu, Icon, color, type TableColumnsType } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useFmt } from '@/shared/i18n/useFmt';
import { useContractCellStyles } from './styles/cells.styles';
import { useContractsUi } from './contracts-store';
import { STATUS_TONE, avColor, avInitial } from './status';
import type { Contract } from './types';

export function StatusChip({ c }: { c: Contract }) {
  const t = useTranslations('contracts');
  const { styles } = useContractCellStyles();
  const [fg, bg] = STATUS_TONE[c.status];
  // "Chờ duyệt" hiển thị trong cột / chip Nháp kèm badge (COMMERCE §9).
  const label = c.status === 'pending_approval' ? 'draft' : c.status;
  return (
    <span>
      <span className={styles.status} style={{ color: fg, background: bg }}>
        {t(`status.${label}`)}
      </span>
      {c.status === 'pending_approval' ? <span className={styles.badge}>{t('badgeApproval')}</span> : null}
    </span>
  );
}

/** Giá trị kiểu prototype "12,8tr". */
export function useTr() {
  const t = useTranslations('contracts');
  const fmt = useFmt();
  return (v: string) => t('tr', { n: fmt.number(Number(v) / 1_000_000) });
}

/** Hiệu lực "16/06/2026 → 16/12/2026" hoặc "—". */
export function useEff() {
  const t = useTranslations('contracts');
  const fmt = useFmt();
  return (c: Contract) =>
    c.start_date && c.end_date
      ? t('eff', { from: fmt.date(c.start_date), to: fmt.date(c.end_date) })
      : t('dash');
}

export function Avatar({ name, small, className }: { name: string; small?: boolean; className?: string }) {
  const { styles, cx } = useContractCellStyles();
  return (
    <span className={cx(styles.av, small && styles.kAv, className)} style={{ background: avColor(name) }}>
      {avInitial(name)}
    </span>
  );
}

function AiCell({ c }: { c: Contract }) {
  const t = useTranslations('contracts');
  const { message } = App.useApp();
  const { styles } = useContractCellStyles();
  return (
    <div className={styles.ai} onClick={(e) => e.stopPropagation()}>
      <span className={styles.aiText} title={c.ai.hint}>
        {t('spark', { hint: c.ai.hint })}
      </span>
      {c.ai.wait ? (
        <button
          type="button"
          className={styles.aiDo}
          title={t('aiDo')}
          aria-label={t('aiDo')}
          onClick={() => void message.info(t('aiDoing', { code: c.code }))}
        >
          <Icon name="ic-bolt" size={12} color={color.white} strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}

function RowMenu({ c }: { c: Contract }) {
  const t = useTranslations('contracts.menu');
  const ui = useContractsUi();
  const canSign = useCan('contract.sign');
  const canReview = useCan('contract.review');
  const canDraft = useCan('contract.draft');
  const changes = useAction('contract.request_changes');
  const reject = useAction('contract.reject_internal');
  const del = useAction('contract.delete');
  const close = () => ui.set({ menuFor: null });
  const pending = c.status === 'pending_approval';
  const items = [
    {
      key: 'view',
      label: t('view'),
      icon: 'ic-eye' as const,
      onClick: () => ui.set({ menuFor: null, detail: c.id, tab: 'overview' }),
    },
    ...(canSign && pending
      ? [
          {
            key: 'approve',
            label: t('approve'),
            icon: 'ic-check' as const,
            iconColor: color.brandInk,
            onClick: () => ui.set({ menuFor: null, signFor: c.id }),
          },
        ]
      : []),
    ...(canReview && pending
      ? [
          {
            key: 'changes',
            label: t('changes'),
            icon: 'ic-doc' as const,
            onClick: () => (close(), void changes.run({ contract_id: c.id })),
          },
          {
            key: 'reject',
            label: t('reject'),
            icon: 'ic-x' as const,
            onClick: () => (close(), void reject.run({ contract_id: c.id })),
          },
        ]
      : []),
    ...(canDraft && c.status === 'draft'
      ? [
          {
            key: 'delete',
            label: t('delete'),
            icon: 'ic-trash' as const,
            danger: true,
            onClick: () => (close(), void del.run({ contract_id: c.id })),
          },
        ]
      : []),
  ];
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <ActionMenu
        open={ui.menuFor === c.id}
        onToggle={() => ui.set({ menuFor: ui.menuFor === c.id ? null : c.id })}
        onClose={close}
        label={t('open')}
        variant="ghost"
        items={items}
      />
    </div>
  );
}

export function useContractColumns(): TableColumnsType<Contract> {
  const t = useTranslations('contracts');
  const fmt = useFmt();
  const tr = useTr();
  const eff = useEff();
  const { styles } = useContractCellStyles();
  return [
    {
      key: 'code',
      title: t('col.code'),
      width: 100,
      render: (_, c) => <span className={styles.code}>{c.code}</span>,
    },
    {
      key: 'cust',
      title: t('col.cust'),
      width: 150,
      render: (_, c) => (
        <div className={styles.custCell}>
          <Avatar name={c.contact_name} />
          <span className={styles.cust}>{c.contact_name}</span>
        </div>
      ),
    },
    {
      key: 'svc',
      title: t('col.svc'),
      width: 170,
      ellipsis: true,
      render: (_, c) => <span className={styles.svc}>{c.title}</span>,
    },
    {
      key: 'value',
      title: <span className={styles.end}>{t('col.value')}</span>,
      width: 110,
      render: (_, c) => <span className={styles.value}>{tr(c.value)}</span>,
    },
    {
      key: 'kind',
      title: t('col.kind'),
      width: 96,
      render: (_, c) => <span className={styles.kind}>{t(`kind.${c.kind}`)}</span>,
    },
    {
      key: 'by',
      title: t('col.by'),
      width: 110,
      render: (_, c) => <span className={styles.by}>{c.owner_name}</span>,
    },
    {
      key: 'at',
      title: t('col.at'),
      width: 98,
      // Chưa ký (server trả '') → ngày tạo.
      render: (_, c) => <span className={styles.at}>{fmt.date(c.signed_date || c.created_at)}</span>,
    },
    {
      key: 'eff',
      title: t('col.eff'),
      width: 150,
      render: (_, c) => <span className={styles.eff}>{eff(c)}</span>,
    },
    {
      key: 'quote',
      title: t('col.quote'),
      width: 100,
      render: (_, c) => <span className={styles.quote}>{c.quote_code || t('dash')}</span>,
    },
    { key: 'status', title: t('col.status'), width: 110, render: (_, c) => <StatusChip c={c} /> },
    { key: 'ai', title: t('col.ai'), width: 150, render: (_, c) => <AiCell c={c} /> },
    {
      key: 'act',
      title: <span className={styles.end}>{t('col.act')}</span>,
      width: 44,
      render: (_, c) => <RowMenu c={c} />,
    },
  ];
}

export function ContractCard({ c }: { c: Contract }) {
  const tr = useTr();
  const { styles } = useContractCellStyles();
  return (
    <>
      <div className={styles.mRow}>
        <span className={styles.code}>{c.code}</span>
        <StatusChip c={c} />
      </div>
      <div className={styles.mRow}>
        <span className={styles.cust}>{c.contact_name}</span>
        <span className={styles.value}>{tr(c.value)}</span>
      </div>
      <span className={styles.svc}>{c.title}</span>
    </>
  );
}

export function ContractKanbanCard({ c, onOpen }: { c: Contract; onOpen: () => void }) {
  const tr = useTr();
  const { styles } = useContractCellStyles();
  return (
    <div className={styles.kCard} onClick={onOpen} data-contract={c.id}>
      <div className={styles.kRow}>
        <span className={styles.kCode}>{c.code}</span>
      </div>
      <div className={styles.kRow}>
        <Avatar name={c.contact_name} small />
        <span className={styles.cust}>{c.contact_name}</span>
      </div>
      <div className={styles.kSvc}>{c.title}</div>
      <div className={styles.kVal}>{tr(c.value)}</div>
    </div>
  );
}
