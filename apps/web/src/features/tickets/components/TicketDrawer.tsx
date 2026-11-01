// Drawer chi tiết ticket — prototype L3276–3361: đầu (mã, ưu tiên, sao chép, tiêu đề, tạo / cập nhật, 4 tab), banner AI (Can thiệp ↔ Giao AI),
// thân theo tab, ô soạn (Ghi chú nội bộ · Trả lời khách → ticket.comment) + Đóng ticket (lý do bắt buộc) / Mở lại.
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { EntityDrawer, Icon, color, layout } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useFmt } from '@/shared/i18n/useFmt';
import { useMe } from '@/shared/shell/useShellData';
import { useTkDetailStyles } from '../styles/detail.styles';
import { useTkTabStyles } from '../styles/tabs.styles';
import { useTicketsUi, type DetailTab as Tab } from '../tickets-store';
import { ticketQuery } from '../api';
import { PRIORITY_TONE } from '../status';
import { DetailTab, HistoryTab, SlaTab, ThreadTab } from './DetailTabs';
import type { Ticket, TicketsMeta } from '../types';

const TABS: Tab[] = ['detail', 'thread', 'history', 'sla'];

function Header({ k, now }: { k: Ticket; now: number }) {
  const t = useTranslations('tickets');
  const fmt = useFmt();
  const { message } = App.useApp();
  const { styles, cx } = useTkDetailStyles();
  const can = useCan('ticket.manage');
  const set = useTicketsUi((s) => s.set);
  const tab = useTicketsUi((s) => s.tab);
  const pc = PRIORITY_TONE[k.priority];
  const copy = () => {
    void navigator.clipboard?.writeText(k.code).catch(() => undefined);
    void message.success(t('detail.copied', { code: k.code }));
  };
  return (
    <div className={styles.head}>
      <div className={styles.idRow}>
        <span className={styles.code}>{k.code}</span>
        <span className={styles.pr} style={{ background: `${pc}18`, color: pc }}>
          <span className={styles.dot} style={{ background: pc }} />
          {t(`priority.${k.priority}`)}
        </span>
        <span className={styles.grow} />
        {can && k.status !== 'closed' ? (
          <button
            type="button"
            className={styles.icon}
            onClick={() => set({ closeFor: k.id })}
            title={t('detail.closeBtn')}
            aria-label={t('detail.closeBtn')}
            data-testid="tk-close"
          >
            <Icon name="ic-check" size={15} color={color.brandInk} />
          </button>
        ) : null}
        <button type="button" className={styles.icon} onClick={copy} title={t('detail.copy')} aria-label={t('detail.copy')}>
          <Icon name="ic-doc" size={15} color={color.text3} />
        </button>
      </div>
      <div className={styles.title}>{k.title}</div>
      <div className={styles.times}>
        <span>{t('detail.created', { t: fmt.relative(k.created_at, now) })}</span>
        <span>{t('detail.updated', { t: fmt.relative(k.updated_at, now) })}</span>
      </div>
      <div className={styles.tabs} role="tablist">
        {TABS.map((x) => (
          <button
            key={x}
            type="button"
            role="tab"
            aria-selected={tab === x}
            className={cx(styles.tab, tab === x && styles.tabOn)}
            onClick={() => set({ tab: x })}
          >
            {t(`detail.tab.${x}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

function AiBanner({ k, meta }: { k: Ticket; meta: TicketsMeta }) {
  const t = useTranslations('tickets.detail');
  const { styles } = useTkDetailStyles();
  const can = useCan('ticket.manage');
  const me = useMe().data;
  const assign = useAction('ticket.assign');
  const ai = !!k.assignee_agent_id;
  const meId = meta.members.find((m) => m.id === me?.user.id)?.id ?? meta.members[0]!.id;
  const toggle = () =>
    void assign.run(ai ? { ticket_id: k.id, assignee_user_id: meId } : { ticket_id: k.id, assignee_agent_id: meta.agent.id });
  return (
    <div className={styles.ai}>
      <span className={styles.aiIc}>
        <Icon name="ic-spark" size={15} color={color.white} />
      </span>
      <div className={styles.grow}>
        <div className={styles.aiT} data-testid="tk-ai-state">
          {ai ? t('aiOn') : t('aiOff')}
        </div>
        <div className={styles.aiS}>{ai ? t('aiOnSub') : t('aiOffSub')}</div>
      </div>
      {can && k.status !== 'closed' && (ai || meta.agent.id) ? (
        <button type="button" className={styles.chip} onClick={toggle} data-testid="tk-takeover">
          <Icon name={ai ? 'ic-users' : 'ic-spark'} size={13} color={color.text3} />
          {ai ? t('takeOver') : t('handAi')}
        </button>
      ) : null}
    </div>
  );
}

function Composer({ k }: { k: Ticket }) {
  const t = useTranslations('tickets');
  const { styles, cx } = useTkTabStyles();
  const comment = useAction('ticket.comment');
  const reopen = useAction('ticket.reopen');
  const [internal, setInternal] = useState(true);
  const [text, setText] = useState('');
  if (k.status === 'closed')
    return (
      <div className={styles.comp}>
        <div className={styles.foot}>
          <span className={styles.closed}>
            {t('detail.closedAs', { reason: t(`closeBox.reasons.${(k.close_reason ?? 'resolved') as 'resolved'}`) })}
          </span>
          <button type="button" className={styles.act} onClick={() => void reopen.run({ ticket_id: k.id })} data-testid="tk-reopen">
            <Icon name="ic-flow" size={14} color={color.text3} />
            {t('detail.reopen')}
          </button>
        </div>
      </div>
    );
  const send = async () => {
    if (!text.trim()) return;
    const r = await comment.run({ ticket_id: k.id, body: text.trim(), internal });
    if (r) setText('');
  };
  return (
    <div className={styles.comp}>
      <div className={styles.modes}>
        {[true, false].map((v) => (
          <button
            key={String(v)}
            type="button"
            className={cx(styles.mode, internal === v && styles.modeOn)}
            onClick={() => setInternal(v)}
            data-testid={v ? 'tk-mode-note' : 'tk-mode-reply'}
          >
            {v ? t('detail.note') : t('detail.reply')}
          </button>
        ))}
      </div>
      <div className={styles.box}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void send()}
          placeholder={internal ? t('detail.notePh') : t('detail.replyPh')}
          aria-label={internal ? t('detail.note') : t('detail.reply')}
          data-testid="tk-comment"
        />
        <button type="button" className={styles.send} onClick={() => void send()} aria-label={t('detail.send')} data-testid="tk-send">
          <Icon name="ic-send" size={15} color={color.white} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

export function TicketDrawer({ meta }: { meta: TicketsMeta }) {
  const t = useTranslations('tickets.detail');
  const { styles } = useTkDetailStyles();
  const ui = useTicketsUi();
  const can = useCan('ticket.manage');
  const k = useQuery({ ...ticketQuery(ui.detail ?? ''), enabled: !!ui.detail }).data;
  const now = Date.parse(meta.now);
  return (
    <EntityDrawer
      open={!!ui.detail}
      onClose={() => ui.set({ detail: null })}
      title={k?.code ?? ''}
      closeLabel={t('close')}
      testId="tk-drawer"
      width={layout.tkDrawer}
      header={k ? <Header k={k} now={now} /> : null}
      footer={k && can ? <Composer k={k} /> : null}
    >
      {k ? (
        <>
          <div className={styles.aiWrap}>
            <AiBanner k={k} meta={meta} />
          </div>
          <div className={styles.body}>
            {ui.tab === 'detail' ? <DetailTab k={k} /> : null}
            {ui.tab === 'thread' ? <ThreadTab k={k} /> : null}
            {ui.tab === 'history' ? <HistoryTab k={k} meta={meta} /> : null}
            {ui.tab === 'sla' ? <SlaTab k={k} /> : null}
          </div>
        </>
      ) : null}
    </EntityDrawer>
  );
}
