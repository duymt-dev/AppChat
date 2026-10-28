// Cột DataTable Ticket — prototype L4899–4931 + thẻ kanban L4941–4947 + thẻ mobile.
// Menu dòng: Xem chi tiết · Tạm dừng (→ waiting, SLA dừng) · Hoàn thành (mở hộp đóng ticket, lý do bắt buộc) · Mở lại (ticket đã đóng).
'use client';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { ActionMenu, Icon, color, gradient, type TableColumnsType } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useFmt } from '@/shared/i18n/useFmt';
import { useTicketCellStyles } from './styles/cells.styles';
import { useTicketsUi } from './tickets-store';
import { CHANNEL_LOOK, PRIORITY_TONE, SLA_TONE, STATUS_TONE, avColor } from './status';
import { useSlaLabel } from './hooks/useSla';
import type { Ticket } from './types';

const SPARK = '✦';

export function Owner({ k, size = 'md' }: { k: Ticket; size?: 'md' | 'sm' }) {
  const { styles } = useTicketCellStyles();
  const ai = !!k.assignee_agent_id;
  return (
    <span
      className={size === 'md' ? styles.av : styles.kAv}
      style={{ background: ai ? gradient.ai : avColor(k.assignee_name) }}
    >
      {ai ? SPARK : k.assignee_name.charAt(0)}
    </span>
  );
}

export function ChannelDot({ k, small }: { k: Ticket; small?: boolean }) {
  const t = useTranslations('tickets.channel');
  const { styles } = useTicketCellStyles();
  const [g, c] = CHANNEL_LOOK[k.channel];
  return (
    <span className={small ? styles.kCh : styles.ch} style={{ background: c }} title={t(k.channel)}>
      {g}
    </span>
  );
}

export function StatusText({ k }: { k: Ticket }) {
  const t = useTranslations('tickets.status');
  const { styles } = useTicketCellStyles();
  const c = STATUS_TONE[k.status];
  return (
    <span className={styles.st} style={{ color: c }} data-testid="tk-row-status">
      <span className={styles.stDot} style={{ background: c }} />
      {t(k.status)}
    </span>
  );
}

function AiCell({ k }: { k: Ticket }) {
  const t = useTranslations('tickets');
  const { message } = App.useApp();
  const { styles } = useTicketCellStyles();
  const hint = k.assignee_agent_id ? t('aiHint.agent') : t('aiHint.user', { name: k.assignee_name });
  return (
    <div className={styles.ai} onClick={(e) => e.stopPropagation()}>
      <span className={styles.aiT} title={hint}>{`${SPARK} ${hint}`}</span>
      <button
        type="button"
        className={styles.aiPeek}
        title={t('aiPeek')}
        aria-label={t('aiPeek')}
        onClick={() => void message.info(t('aiPeekMsg', { code: k.code, hint }))}
      >
        <Icon name="ic-spark" size={12} color={color.violet} />
      </button>
    </div>
  );
}

function RowMenu({ k }: { k: Ticket }) {
  const t = useTranslations('tickets.menu');
  const ui = useTicketsUi();
  const can = useCan('ticket.manage');
  const setStatus = useAction('ticket.set_status');
  const reopen = useAction('ticket.reopen');
  const close = () => ui.set({ menuFor: null });
  const closed = k.status === 'closed';
  const items = [
    { key: 'view', label: t('view'), icon: 'ic-eye' as const, onClick: () => ui.set({ menuFor: null, detail: k.id, tab: 'detail' }) },
    ...(can && !closed && k.status !== 'waiting'
      ? [
          {
            key: 'pause',
            label: t('pause'),
            icon: 'ic-clock' as const,
            onClick: () => (close(), void setStatus.run({ ticket_id: k.id, status: 'waiting' })),
          },
        ]
      : []),
    ...(can && !closed
      ? [{ key: 'close', label: t('close'), icon: 'ic-check' as const, onClick: () => ui.set({ menuFor: null, closeFor: k.id }) }]
      : []),
    ...(can && closed
      ? [{ key: 'reopen', label: t('reopen'), icon: 'ic-flow' as const, onClick: () => (close(), void reopen.run({ ticket_id: k.id })) }]
      : []),
  ];
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <ActionMenu
        open={ui.menuFor === k.id}
        onToggle={() => ui.set({ menuFor: ui.menuFor === k.id ? null : k.id })}
        onClose={close}
        label={t('open')}
        variant="ghost"
        items={items}
      />
    </div>
  );
}

export function useTicketColumns(now: string): TableColumnsType<Ticket> {
  const t = useTranslations('tickets');
  const fmt = useFmt();
  const sla = useSlaLabel();
  const { styles } = useTicketCellStyles();
  const nowMs = Date.parse(now);
  return [
    {
      key: 'title',
      title: t('col.title'),
      width: 260,
      render: (_, k) => (
        <div className={styles.min0}>
          <div className={styles.idRow}>
            <span className={styles.code}>{k.code}</span>
            <span className={styles.pr} style={{ background: `${PRIORITY_TONE[k.priority]}18`, color: PRIORITY_TONE[k.priority] }}>
              <span className={styles.prDot} style={{ background: PRIORITY_TONE[k.priority] }} />
              {t(`priority.${k.priority}`)}
            </span>
          </div>
          <div className={styles.title}>{k.title}</div>
          <div className={styles.cat}>{k.category}</div>
        </div>
      ),
    },
    {
      key: 'cust',
      title: t('col.cust'),
      width: 160,
      render: (_, k) => (
        <div className={styles.who}>
          <ChannelDot k={k} />
          <div className={styles.min0}>
            <div className={styles.name}>{k.company}</div>
            <div className={styles.subT}>{k.email}</div>
          </div>
        </div>
      ),
    },
    { key: 'status', title: t('col.status'), width: 110, render: (_, k) => <StatusText k={k} /> },
    {
      key: 'owner',
      title: t('col.owner'),
      width: 150,
      render: (_, k) => (
        <div className={styles.who}>
          <Owner k={k} />
          <div className={styles.min0}>
            <div className={styles.owner}>{k.assignee_name}</div>
            <div className={styles.subT}>{k.team_name}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'sla',
      title: t('col.sla'),
      width: 120,
      render: (_, k) => (
        <div data-sla={k.sla.state}>
          <div className={styles.sla} style={{ color: SLA_TONE[k.sla.state] }}>
            <Icon name="ic-clock" size={12} color={SLA_TONE[k.sla.state]} />
            {sla(k)}
          </div>
          <div className={styles.slaL} style={{ color: SLA_TONE[k.sla.state] }}>
            {t(`slaState.${k.sla.state}`)}
          </div>
        </div>
      ),
    },
    {
      key: 'upd',
      title: <span className={styles.end}>{t('col.updated')}</span>,
      width: 110,
      render: (_, k) => <span className={styles.upd}>{fmt.relative(k.updated_at, nowMs)}</span>,
    },
    { key: 'ai', title: t('col.ai'), width: 140, render: (_, k) => <AiCell k={k} /> },
    {
      key: 'act',
      title: <span className={styles.end}>{t('col.act')}</span>,
      width: 64,
      render: (_, k) => (
        <div className={styles.menu}>
          <RowMenu k={k} />
        </div>
      ),
    },
  ];
}

export function TicketCard({ k }: { k: Ticket }) {
  const sla = useSlaLabel();
  const { styles } = useTicketCellStyles();
  return (
    <>
      <div className={styles.mRow}>
        <span className={styles.code}>{k.code}</span>
        <StatusText k={k} />
      </div>
      <div className={styles.title}>{k.title}</div>
      <div className={styles.mRow}>
        <span className={styles.subT}>{k.company}</span>
        <span className={styles.slaL} style={{ color: SLA_TONE[k.sla.state] }}>
          {sla(k)}
        </span>
      </div>
    </>
  );
}

export function TicketKanbanCard({ k, onOpen }: { k: Ticket; onOpen: () => void }) {
  const t = useTranslations('tickets');
  const sla = useSlaLabel();
  const { styles } = useTicketCellStyles();
  const pc = PRIORITY_TONE[k.priority];
  return (
    <div className={styles.kCard} onClick={onOpen} data-ticket={k.id}>
      <div className={styles.kTop}>
        <span className={styles.code}>{k.code}</span>
        <span className={styles.kPr} style={{ background: `${pc}18`, color: pc }}>
          {t(`priority.${k.priority}`)}
        </span>
      </div>
      <div className={styles.kTitle}>{k.title}</div>
      <div className={styles.kRow}>
        <ChannelDot k={k} small />
        <span className={styles.kCo}>{k.company}</span>
        <Owner k={k} size="sm" />
      </div>
      <div className={styles.kSla} style={{ color: SLA_TONE[k.sla.state] }}>{`⏱ ${sla(k)}`}</div>
    </div>
  );
}
