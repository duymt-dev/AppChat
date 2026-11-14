// Khối "Hành vi AI Agent" của drawer Quản lý kênh (TIP-022b): lịch hoạt động có cấu trúc của tài khoản (giao với lịch agent), lời chào tự
// động (bật tường minh — cấu hình cũ tắt), phân luồng từ khoá theo agent đã xuất bản (ưu tiên + cụm từ). Lưu riêng bằng
// `channel.update_settings` kèm `expected_version` — người khác đổi gán giữa chừng → 409, giữ gán cũ, tải lại. Cần channels.manage.
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ROUTING_MAX_CANDIDATES, emptySchedule } from '@appchat/shared';
import { agentsQuery } from '@/features/agents/api';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { WeeklyScheduleFields } from '@/shared/forms/WeeklyScheduleFields';
import { useWeeklySchedule } from '@/shared/forms/useWeeklySchedule';
import { useSectionStyles } from '../styles/section.styles';
import { useChannelManageStyles } from '../styles/channel-manage.styles';
import { Switch } from './Switch';
import { emptyBehavior, type ChannelAgentBehavior } from '../channel-behavior-types';
import type { ChannelAccount } from '../channel-types';

const splitKeywords = (v: string) => [...new Set(v.split(',').map((k) => k.trim()).filter(Boolean))].slice(0, 20);

export function ChannelRoutingSettings({ account }: { account: ChannelAccount }) {
  const t = useTranslations('settings.channels.behavior');
  const { message } = App.useApp();
  const s = useSectionStyles().styles;
  const { styles } = useChannelManageStyles();
  const canManage = useCan('channels.manage');
  const agents = (useQuery(agentsQuery()).data?.data ?? []).filter((a) => a.version > 0);
  const base = account.agent_behavior ?? emptyBehavior();
  const [draft, setDraft] = useState<ChannelAgentBehavior | null>(null);
  const cur = draft ?? base;
  const save = useAction('channel.update_settings');
  const set = (p: Partial<ChannelAgentBehavior>) => setDraft({ ...cur, ...p });
  const sched = useWeeklySchedule(cur.schedule, (v) => set({ schedule: v }), () => window.confirm(t('overnight')));
  const cands = cur.routing.candidates;
  const setCand = (i: number, p: Partial<(typeof cands)[number]>) => set({ routing: { ...cur.routing, candidates: cands.map((c, j) => (j === i ? { ...c, ...p } : c)) } });

  const submit = async () => {
    if (!draft) return;
    const ok = await save.run({
      channel_account_id: account.id,
      patch: { schedule: draft.schedule, routing: draft.routing, greeting_enabled: draft.greeting_enabled },
      ...(account.binding_version ? { expected_version: account.binding_version } : {}),
    });
    if (ok) {
      message.success(t('saved'));
      setDraft(null);
    }
  };

  return (
    <div className={styles.block} data-testid="st-ch-behavior">
      <div className={styles.blockT}>{t('title')}</div>
      <div className={s.muted}>{t('sub')}</div>

      <div className={styles.syncRow}>
        <div className={styles.acctBody}>
          <div className={styles.syncLbl}>{t('scheduleOn')}</div>
          <div className={styles.syncD}>{t('scheduleD')}</div>
        </div>
        <Switch on={!!cur.schedule} onChange={(v) => set({ schedule: v ? emptySchedule() : null })} label={t('scheduleOn')} testId="st-ch-behavior-schedule-on" />
      </div>
      {cur.schedule ? <WeeklyScheduleFields value={sched.value} errors={sched.errors} onTimezone={sched.onTimezone} onAdd={sched.onAdd} onRemove={sched.onRemove} onChange={sched.onChange} disabled={!canManage} testId="st-ch-behavior-week" /> : null}

      <div className={styles.syncRow}>
        <div className={styles.acctBody}>
          <div className={styles.syncLbl}>{t('greetingOn')}</div>
          <div className={styles.syncD}>{account.greeting ? t('greetingD') : t('greetingEmpty')}</div>
        </div>
        <Switch on={cur.greeting_enabled} onChange={(v) => set({ greeting_enabled: v })} label={t('greetingOn')} testId="st-ch-behavior-greeting" />
      </div>

      <div className={styles.syncRow}>
        <div className={styles.acctBody}>
          <div className={styles.syncLbl}>{t('routingOn')}</div>
          <div className={styles.syncD}>{t('routingD')}</div>
        </div>
        <Switch on={cur.routing.enabled} onChange={(v) => set({ routing: { ...cur.routing, enabled: v } })} label={t('routingOn')} testId="st-ch-behavior-routing" />
      </div>
      {cur.routing.enabled ? (
        <div data-testid="st-ch-behavior-cands">
          {cands.map((c, i) => (
            <div key={i} className={styles.grid2} data-testid={`st-ch-behavior-cand-${i}`}>
              <select className={s.select} value={c.agent_id} onChange={(e) => setCand(i, { agent_id: e.target.value })} aria-label={t('agent')} data-testid={`st-ch-behavior-cand-${i}-agent`}>
                <option value="">—</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <input className={s.input} type="number" min={0} max={100} value={c.priority} onChange={(e) => setCand(i, { priority: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} aria-label={t('priority')} data-testid={`st-ch-behavior-cand-${i}-priority`} />
              <input className={s.input} defaultValue={c.keywords.join(', ')} placeholder={t('keywordsPh')} onBlur={(e) => setCand(i, { keywords: splitKeywords(e.target.value) })} aria-label={t('keywords')} data-testid={`st-ch-behavior-cand-${i}-keywords`} />
              <button type="button" className={s.ghost} onClick={() => set({ routing: { ...cur.routing, candidates: cands.filter((_, j) => j !== i) } })} data-testid={`st-ch-behavior-cand-${i}-rm`}>
                {t('remove')}
              </button>
            </div>
          ))}
          <button type="button" className={s.ghost} disabled={cands.length >= ROUTING_MAX_CANDIDATES} onClick={() => set({ routing: { ...cur.routing, candidates: [...cands, { agent_id: '', priority: 10, keywords: [] }] } })} data-testid="st-ch-behavior-add">
            {t('add')}
          </button>
        </div>
      ) : null}

      {canManage ? (
        <div>
          <button type="button" className={s.primary} disabled={!draft || !sched.valid || save.isPending || cands.some((c) => !c.agent_id)} onClick={() => void submit()} data-testid="st-ch-behavior-save">
            {save.isPending ? t('saving') : t('save')}
          </button>
          {draft ? (
            <button type="button" className={s.ghost} onClick={() => setDraft(null)} data-testid="st-ch-behavior-revert">
              {t('revert')}
            </button>
          ) : null}
        </div>
      ) : (
        <div className={s.muted}>{t('readonly')}</div>
      )}
    </div>
  );
}
