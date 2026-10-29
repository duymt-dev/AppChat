// Nội dung 4 tab drawer ticket — prototype L3300–3350: Chi tiết (đồng hồ SLA, thông tin chung, mô tả, macro), Trao đổi (luồng bình luận),
// Lịch sử (timeline sự kiện), SLA (đếm ngược + FRT / TTR / escalation). Macro chạy ticket.comment / ticket.set_status / mở hộp đóng.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useFmt } from '@/shared/i18n/useFmt';
import { useTkDetailStyles } from '../styles/detail.styles';
import { useTkTabStyles } from '../styles/tabs.styles';
import { useTicketsUi } from '../tickets-store';
import { PRIORITY_TONE, STATUS_TONE } from '../status';
import { slaProgress, useDur, useSlaLabel } from '../hooks/useSla';
import { ChannelDot, Owner } from '../columns';
import type { Ticket, TicketsMeta } from '../types';

const MACROS: [key: string, tone: string, icon: IconName][] = [
  ['ack', color.blue, 'ic-check'],
  ['guide', color.successStrong, 'ic-doc'],
  ['info', color.amberGold, 'ic-inbox'],
  ['tech', color.violet, 'ic-flow'],
  ['resolve', color.tealDeep, 'ic-check'],
];
const EV_TONE: Record<string, string> = {
  created: color.info,
  assigned: color.violet,
  closed: color.closedGreen,
  reopened: color.amberGold,
};

export function SlaClock({ k, big }: { k: Ticket; big?: boolean }) {
  const t = useTranslations('tickets.detail');
  const { styles } = useTkDetailStyles();
  const label = useSlaLabel();
  const { pct, tone } = slaProgress(k);
  return (
    <div className={styles.clock} style={{ background: `${tone}18` }} data-testid="tk-sla-clock">
      <div className={styles.clockH}>
        <Icon name="ic-clock" size={big ? 17 : 16} color={tone} />
        <span className={styles.clockL}>{big ? t('slaCountdown') : t('slaLeft')}</span>
        <span className={styles.grow} />
        <span className={styles.clockV} style={{ color: tone }} data-testid="tk-sla-left">
          {label(k)}
        </span>
      </div>
      <div className={styles.track}>
        <div style={{ width: `${k.status === 'closed' ? 100 : pct}%`, background: tone }} />
      </div>
      <div className={styles.clockS}>
        {k.status === 'waiting' ? t('paused') : t('due', { h: Math.round(k.ttr_target_min / 60) })}
      </div>
    </div>
  );
}

export function DetailTab({ k }: { k: Ticket }) {
  const t = useTranslations('tickets');
  const { styles } = useTkDetailStyles();
  const can = useCan('ticket.manage');
  const set = useTicketsUi((s) => s.set);
  const comment = useAction('ticket.comment');
  const setStatus = useAction('ticket.set_status');
  const pc = PRIORITY_TONE[k.priority];
  const sc = STATUS_TONE[k.status];
  const macro = (m: string) => {
    if (m === 'resolve') return set({ closeFor: k.id });
    if (m === 'tech') return void setStatus.run({ ticket_id: k.id, status: 'in_progress' });
    void comment.run({ ticket_id: k.id, body: t(`detail.macroText.${m}` as never), internal: false });
  };
  return (
    <>
      <SlaClock k={k} />
      <div className={styles.h}>{t('detail.info')}</div>
      <div className={styles.grid}>
        <div>
          <div className={styles.lbl}>{t('detail.cust')}</div>
          <div className={styles.val}>{k.company}</div>
          <div className={styles.sub}>{k.email}</div>
        </div>
        <div>
          <div className={styles.lbl}>{t('detail.status')}</div>
          <span className={styles.who} style={{ color: sc }}>
            <span className={styles.dot} style={{ background: sc, width: 7, height: 7 }} />
            <span className={styles.val} style={{ color: sc }} data-testid="tk-status">
              {t(`status.${k.status}`)}
            </span>
          </span>
        </div>
        <div>
          <div className={styles.lbl}>{t('detail.owner')}</div>
          <div className={styles.who}>
            <Owner k={k} />
            <span className={styles.val} data-testid="tk-owner">
              {k.assignee_name}
            </span>
          </div>
        </div>
        <div>
          <div className={styles.lbl}>{t('detail.team')}</div>
          <div className={styles.val}>{k.team_name}</div>
        </div>
        <div>
          <div className={styles.lbl}>{t('detail.category')}</div>
          <div className={styles.val}>{k.category}</div>
        </div>
        <div>
          <div className={styles.lbl}>{t('detail.priority')}</div>
          <div className={styles.val} style={{ color: pc }}>
            {t(`priority.${k.priority}`)}
          </div>
        </div>
      </div>
      <div className={styles.h8}>{t('detail.desc')}</div>
      <div className={styles.desc}>{k.description || t('detail.noDesc')}</div>
      {can && k.status !== 'closed' ? (
        <>
          <div className={styles.h8}>{t('detail.macros')}</div>
          <div className={styles.macros}>
            {MACROS.map(([m, c, ic]) => (
              <button key={m} type="button" className={styles.macro} onClick={() => macro(m)} data-testid={`tk-macro-${m}`}>
                <span className={styles.macroIc} style={{ background: `${c}14` }}>
                  <Icon name={ic} size={14} color={c} />
                </span>
                <span className={styles.macroL}>{t(`detail.macro.${m}` as never)}</span>
                <Icon name="ic-arrow" size={14} color={color.text4} />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}

export function ThreadTab({ k }: { k: Ticket }) {
  const t = useTranslations('tickets.detail');
  const { styles, cx } = useTkTabStyles();
  return (
    <div className={styles.thread} data-testid="tk-thread">
      {k.comments.map((c) => {
        const mine = c.author_type !== 'contact';
        return (
          <div key={c.id} className={cx(styles.msg, mine && styles.mine)} data-comment={c.internal ? 'internal' : 'public'}>
            {mine ? (
              <span className={styles.aiAv}>
                <Icon name="ic-spark" size={15} color={color.white} />
              </span>
            ) : (
              <ChannelDot k={k} />
            )}
            <div className={styles.bubbleW}>
              <div className={cx(styles.who, mine && styles.whoR)}>{c.author}</div>
              <div className={cx(styles.bubble, mine && (c.internal ? styles.note : styles.out))}>
                {c.internal ? <span className={styles.noteTag}>{t('internal')}</span> : null}
                {c.body}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HistoryTab({ k, meta }: { k: Ticket; meta: TicketsMeta }) {
  const t = useTranslations('tickets');
  const fmt = useFmt();
  const { styles } = useTkTabStyles();
  const by = (b: string) => (b === 'system' || b === 'routing' ? t(`detail.by.${b}`) : b);
  const text = (e: Ticket['events'][number]) =>
    e.type === 'assigned'
      ? t('detail.ev.assigned', { name: k.assignee_name })
      : e.type === 'status'
        ? t('detail.ev.status', { status: t(`status.${e.status as 'open'}`) })
        : e.type === 'closed'
          ? t('detail.ev.closed', { reason: t(`closeBox.reasons.${e.reason as 'resolved'}`) })
          : t(`detail.ev.${e.type}` as never);
  const now = Date.parse(meta.now);
  return (
    <div className={styles.hist} data-testid="tk-history">
      {k.events.map((e, i) => (
        <div key={`${e.type}${i}`} className={styles.hRow}>
          <div className={styles.hRail}>
            <span className={styles.hDot} style={{ background: EV_TONE[e.type] ?? STATUS_TONE[k.status] }} />
            <span className={styles.hLine} />
          </div>
          <div className={styles.hBody}>
            <div className={styles.hT}>{text(e)}</div>
            <div className={styles.hS}>{`${by(e.by)} · ${fmt.relative(e.at, now)}`}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SlaTab({ k }: { k: Ticket }) {
  const t = useTranslations('tickets.detail');
  const { styles } = useTkTabStyles();
  const dur = useDur();
  const label = useSlaLabel();
  const ttrOk = k.sla.state !== 'breach';
  const rows: [string, string, string, boolean][] = [
    ['frt', dur(k.frt_min), dur(k.frt_target_min), k.frt_min <= k.frt_target_min],
    ['ttr', label(k), dur(k.ttr_target_min), ttrOk],
    ['esc', String(k.escalations), '1', k.escalations <= 1],
  ];
  return (
    <>
      <SlaClock k={k} big />
      {rows.map(([key, v, tg, ok]) => {
        const c = ok ? color.okStrong : color.dangerStrong;
        return (
          <div key={key} className={styles.slaRow} data-sla-row={key}>
            <span className={styles.slaDot} style={{ background: c }} />
            <div className={styles.grow}>
              <div className={styles.hT}>{t(`slaRow.${key}` as never)}</div>
              <div className={styles.hS}>{t('target', { v: t('le', { v: tg }) })}</div>
            </div>
            <span className={styles.slaV} style={{ color: c }}>
              {v}
            </span>
          </div>
        );
      })}
      <div className={styles.policy}>
        {t('policy', { name: k.sla_policy_name })}
        {k.sla_result ? ` · ${t(`result.${k.sla_result}`)}` : ''}
      </div>
    </>
  );
}
