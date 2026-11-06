// Đầu màn Ticket — prototype L4838–4875: topbar (tiêu đề, phụ đề, tìm, Tạo ticket mới, Trợ lý AI), 5 KPI (bấm = lọc nhanh),
// tiêu đề "Tất cả ticket · n", 6 select lọc + Mới nhất / Xuất / Danh sách · Kanban.
'use client';
import { useTranslations } from 'next-intl';
import { AiButton, Icon, color, type IconName } from '@appchat/ui';
import { useCan } from '@/shared/authz/useCan';
import { useListExport } from '@/shared/actions/useListExport';
import { useTicketsStyles } from '../styles/tickets.styles';
import { EMPTY_FILTER, useTicketsUi } from '../tickets-store';
import { PRIORITIES, SLA_STATES, STATUSES } from '../status';
import type { TicketFilter, TicketsMeta } from '../types';
import { CustomFilterSelects } from '@/shared/custom-fields';

type KpiKey = keyof TicketsMeta['counts'];
const KPI: [KpiKey, IconName, string, Partial<TicketFilter>][] = [
  ['total', 'ic-ticket', color.info, {}],
  ['open', 'ic-inbox', color.amberGold, { status: 'open' }],
  ['waiting', 'ic-clock', color.violet, { status: 'waiting' }],
  ['breach', 'ic-bell', color.dangerStrong, { sla: 'breach' }],
  ['closed', 'ic-check', color.closedGreen, { status: 'closed' }],
];
const VIEWS = [
  ['list', 'ic-inbox'],
  ['kanban', 'ic-grid'],
] as const;

const AGENT = 'agent';
type SelKey = 'priority' | 'status' | 'team' | 'category' | 'assignee' | 'sla';

function Sel({ k, opts, testId }: { k: SelKey; opts: [string, string][]; testId?: string }) {
  const t = useTranslations('tickets.filter');
  const { styles } = useTicketsStyles();
  const ui = useTicketsUi();
  return (
    <select
      className={styles.select}
      value={ui.filter[k]}
      onChange={(e) => ui.setFilter({ [k]: e.target.value })}
      aria-label={t(k)}
      data-testid={testId}
    >
      <option value="all">{t(k)}</option>
      {opts.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

export function TicketsHeader({ meta, count }: { meta: TicketsMeta | undefined; count: number }) {
  const t = useTranslations('tickets');
  const tc = useTranslations('common');
  const { styles, cx } = useTicketsStyles();
  const ui = useTicketsUi();
  const canCreate = useCan('ticket.manage');
  const f = ui.filter;
  const exp = useListExport('ticket.export');
  const kpiOn = (p: Partial<TicketFilter>) =>
    Object.keys(p).length
      ? Object.entries(p).every(([k, v]) => f[k as keyof TicketFilter] === v)
      : f.status === 'all' && f.sla === 'all';
  return (
    <>
      <div className={styles.top}>
        <div className={styles.title}>{t('title')}</div>
        <span className={styles.sub}>{t('sub')}</span>
        <span className={styles.grow} />
        <div className={styles.search}>
          <Icon name="ic-search" size={14} color={color.text4} />
          <input
            value={f.q}
            onChange={(e) => ui.setFilter({ q: e.target.value })}
            placeholder={t('search')}
            aria-label={t('search')}
            data-testid="tk-search"
          />
        </div>
        {canCreate ? (
          <button type="button" className={styles.primary} onClick={() => ui.set({ form: true, prefill: null })} data-testid="tk-create">
            <Icon name="ic-plus" size={14} color={color.white} strokeWidth={2} />
            {t('create')}
          </button>
        ) : null}
        <AiButton label={tc('aiButton')} module={t('title')} onClick={() => ui.set({ aiOpen: true })} testId="tk-ai-open" />
      </div>
      <div className={styles.kpis} data-testid="tk-kpis">
        {KPI.map(([k, ic, c, p]) => (
          <button
            key={k}
            type="button"
            className={cx(styles.kpi, kpiOn(p) && styles.kpiOn)}
            onClick={() => ui.setFilter({ ...EMPTY_FILTER, q: f.q, ...p })}
            data-testid={`tk-kpi-${k}`}
          >
            <span className={styles.kpiIc} style={{ background: `${c}18` }}>
              <Icon name={ic} size={16} color={c} strokeWidth={1.9} />
            </span>
            <div>
              <div className={styles.kpiL}>{t(`kpi.${k}`)}</div>
              <div className={styles.kpiRow}>
                <span className={styles.kpiV} data-testid={`tk-kpi-${k}-v`}>
                  {meta?.counts[k] ?? ''}
                </span>
                <span className={styles.kpiT} style={{ color: k === 'breach' ? color.dangerStrong : color.okStrong }}>
                  {meta?.trend[k] ? t('trend', { v: meta.trend[k] }) : ''}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className={styles.head}>
        <span className={styles.headT}>{t('listTitle')}</span>
        <span className={styles.headN} data-testid="tk-count">
          {t('listCount', { n: count })}
        </span>
      </div>
      <div className={styles.bar}>
        <Sel k="priority" opts={PRIORITIES.map((p) => [p, t(`priority.${p}`)])} testId="tk-f-priority" />
        <Sel k="status" opts={STATUSES.map((s) => [s, t(`status.${s}`)])} testId="tk-f-status" />
        <Sel k="team" opts={(meta?.teams ?? []).map((x) => [x.id, x.name])} />
        <Sel k="category" opts={(meta?.categories ?? []).map((c) => [c, c])} />
        <Sel k="assignee" opts={[...(meta?.members ?? []).map((m): [string, string] => [m.id, m.name]), [AGENT, t('agent')]]} testId="tk-f-assignee" />
        <Sel k="sla" opts={SLA_STATES.map((s) => [s, t(`slaState.${s}`)])} testId="tk-f-sla" />
        <CustomFilterSelects
          entity="ticket"
          className={styles.select}
          value={f.custom}
          onChange={(custom) => ui.setFilter({ custom })}
        />
        <span className={styles.grow} />
        <button
          type="button"
          className={styles.chip}
          onClick={() => ui.setFilter({ sort: f.sort === 'recent' ? 'priority' : 'recent' })}
          data-testid="tk-sort"
        >
          <Icon name="ic-sort" size={13} color={color.text3} />
          {t(`sort.${f.sort}`)}
        </button>
        <button type="button" className={styles.chip} data-testid="tk-export" disabled={exp.busy} aria-busy={exp.busy} onClick={() => void exp.start(ui.filter)}>
          <Icon name="ic-download" size={13} color={color.text3} />
          {exp.label ?? t('export')}
        </button>
        <div className={styles.seg} role="tablist">
          {VIEWS.map(([v, ic]) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={ui.layout === v}
              className={cx(styles.segBtn, ui.layout === v && styles.segOn)}
              onClick={() => ui.set({ layout: v })}
              data-testid={`tk-view-${v}`}
            >
              <Icon name={ic} size={13} color="currentColor" strokeWidth={1.9} />
              {t(`view.${v}`)}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
