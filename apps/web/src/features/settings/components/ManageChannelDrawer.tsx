// Drawer Quản lý kênh 2 cấp (REQ-B11, prototype L870–966): cấp 1 danh sách tài khoản, cấp 2 chi tiết 6 khối
// (tổng quan kết nối · hiệu suất 7 ngày · trả lời tự động · phân công & SLA · đồng bộ · vùng nguy hiểm).
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { EntityDrawer } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { agentsQuery } from '@/features/agents/api';
import { useSectionStyles } from '../styles/section.styles';
import { useChannelManageStyles } from '../styles/channel-manage.styles';
import { useSettingsUi } from '../settings-store';
import { channelAccountStatsQuery, channelsQuery, resolveSlaPolicyId, slaPoliciesQuery } from '../api';
import { Switch } from './Switch';
import { ContactSyncPanel } from './ContactSyncPanel';
import { FriendsPanel } from './FriendsPanel';
import { ChannelRoutingFields } from './ChannelRoutingFields';
import { ChannelRoutingSettings } from './ChannelRoutingSettings';
import { ChannelRateFields } from './ChannelRateFields';
import type { ChannelAccount, ChannelAiMode, ChannelHistoryDays } from '../types';
import { useFmt } from '@/shared/i18n/useFmt';

const MODES: ChannelAiMode[] = ['auto', 'suggest', 'off'];
const HISTORIES: ChannelHistoryDays[] = [0, 7, 30, 90];
const HEALTH_GOOD: ChannelAccount['health'][] = ['good'];
const OP_PROFILES = 'profiles';
const OP_FRIEND_REQUESTS = 'friend_requests';
const hasOp = (ops: string[] | undefined, op: string) => (ops ?? []).includes(op);

export function ManageChannelDrawer() {
  const t = useTranslations('settings.channels.drawer');
  const fmt = useFmt();
  const { message } = App.useApp();
  const s = useSectionStyles().styles;
  const { styles, cx } = useChannelManageStyles();
  const drawer = useSettingsUi((x) => x.channelDrawer);
  const set = useSettingsUi((x) => x.set);
  const channels = useQuery({ ...channelsQuery('all'), enabled: !!drawer }).data ?? [];
  const agents = useQuery({ ...agentsQuery(), enabled: !!drawer }).data?.data ?? [];
  const c = drawer ? channels.find((x) => x.type === drawer.type) : null;
  const account = c && drawer?.accountId ? c.accounts.find((a) => a.id === drawer.accountId) : null;
  const stats = useQuery({ ...channelAccountStatsQuery(account?.id ?? ''), enabled: !!account }).data;
  const slaPolicies = useQuery({ ...slaPoliciesQuery(), enabled: !!account }).data ?? [];

  const [draft, setDraft] = useState<Partial<ChannelAccount> | null>(null);
  const cur = { ...account, ...draft } as ChannelAccount | undefined;

  const test = useAction('channel.test');
  const resync = useAction('channel.sync_history');
  const updateSettings = useAction('channel.update_settings');
  const pause = useAction('channel.pause');
  const resume = useAction('channel.resume');
  const disconnect = useAction('channel.disconnect');

  if (!drawer || !c) return null;
  const close = () => {
    set({ channelDrawer: null });
    setDraft(null);
  };
  const open = (accountId: string | null) => {
    set({ channelDrawer: { type: drawer.type, accountId } });
    setDraft(null);
  };
  const patch = (p: Partial<ChannelAccount>) => setDraft((d) => ({ ...d, ...p }));

  const save = async () => {
    if (!account || !draft) return close();
    if (
      await updateSettings.run({
        channel_account_id: account.id,
        patch: {
          name: draft.name,
          agent_id: draft.agent_id,
          ai_mode: draft.ai_mode,
          hours: draft.hours,
          greeting: draft.greeting,
          sla_policy: draft.sla_policy,
          sync_messages: draft.sync_messages,
          sync_auto_create_contact: draft.sync_auto_create_contact,
          rate_per_minute: draft.rate_per_minute,
          daily_cap: draft.daily_cap ?? undefined,
        },
        // TIP-022b: đổi agent trực kèm phiên bản gán đã xem — người khác đổi giữa chừng → 409, giữ gán cũ.
        ...(draft.agent_id !== undefined && account.binding_version ? { expected_version: account.binding_version } : {}),
      })
    ) {
      if (draft.history_days !== undefined && draft.history_days !== account.history_days) {
        await resync.run({ channel_account_id: account.id, history_days: draft.history_days });
      }
      message.success(t('saved'));
      close();
    }
  };

  const doDisconnect = async () => {
    if (!account) return;
    if (!window.confirm(t('disconnectConfirm', { n: account.name }))) return;
    // Người đã đóng drawer trong lúc chờ → không mở lại (chỉ quay về danh sách nếu drawer vẫn đang mở đúng tài khoản này).
    if ((await disconnect.run({ channel_account_id: account.id })) && useSettingsUi.getState().channelDrawer?.accountId === account.id) open(null);
  };

  return (
    <EntityDrawer
      open={!!drawer}
      onClose={close}
      title={t('manageTitle', { n: c.name })}
      icon="ic-spark"
      closeLabel={t('close')}
      width={560}
      testId="st-ch-drawer"
      footer={
        <div className={styles.foot}>
          <span className={styles.grow} />
          <button type="button" className={s.ghost} onClick={close} data-testid="st-ch-drawer-close">
            {t('close')}
          </button>
          {account ? (
            <button type="button" className={s.primary} onClick={() => void save()} disabled={!draft || updateSettings.isPending} data-testid="st-ch-drawer-save">
              {t('save')}
            </button>
          ) : (
            <button
              type="button"
              className={s.primary}
              onClick={() => {
                close();
                set({ channelWizard: { type: c.type, step: 2 } });
              }}
              data-testid="st-ch-drawer-add"
            >
              {t('addAccount')}
            </button>
          )}
        </div>
      }
    >
      {!account ? (
        <div className={styles.stack}>
          <div className={styles.sumGrid}>
            <div className={styles.sumCard}>
              <div className={styles.sumL}>{t('sum.convs')}</div>
              <div className={styles.sumV}>{fmt.number(c.accounts.reduce((n, a) => n + a.convs, 0))}</div>
            </div>
            <div className={styles.sumCard}>
              <div className={styles.sumL}>{t('sum.frt')}</div>
              <div className={styles.sumV}>{c.frt}</div>
            </div>
            <div className={styles.sumCard}>
              <div className={styles.sumL}>{t('sum.accounts')}</div>
              <div className={styles.sumV}>{c.accounts.length}</div>
            </div>
          </div>
          <div className={styles.acctCard}>
            <div className={styles.acctHead}>
              <span className={styles.acctHeadLbl}>{t('accountsOf', { n: c.name })}</span>
              <button
                type="button"
                className={styles.acctAdd}
                onClick={() => {
                  close();
                  set({ channelWizard: { type: c.type, step: 2 } });
                }}
                data-testid="st-ch-drawer-add-inline"
              >
                {t('addAccount')}
              </button>
            </div>
            {c.accounts.map((a) => (
              <button key={a.id} type="button" className={styles.acctRow} onClick={() => open(a.id)} data-testid={`st-ch-drawer-acct-${a.id}`}>
                <span className={styles.acctIni} style={{ background: c.color }}>
                  {a.name.slice(0, 1).toUpperCase()}
                </span>
                <div className={styles.acctBody}>
                  <div className={styles.acctName}>
                    <span className={styles.acctNameT}>{a.name}</span>
                    <span className={cx(styles.hSt, HEALTH_GOOD.includes(a.health) ? styles.hStGood : styles.hStBad)}>
                      <span className={styles.hDot} />
                    </span>
                  </div>
                  <div className={styles.acctMeta}>
                    <span>{fmt.number(a.convs)}</span>
                    {a.agent ? <span className={styles.acctAgent}>{a.agent}</span> : null}
                  </div>
                </div>
                <span className={styles.acctGo}>{t('manage')}</span>
              </button>
            ))}
          </div>
          <div className={styles.hint}>{t('hint')}</div>
        </div>
      ) : (
        <div className={styles.stack}>
          <button type="button" className={styles.back} onClick={() => open(null)} data-testid="st-ch-drawer-back">
            {t('backToList')}
          </button>

          <div className={styles.block}>
            <div className={styles.blockT}>{t('s1')}</div>
            <div className={styles.infoGrid}>
              <span className={styles.infoK}>{t('info.name')}</span>
              <span className={styles.infoV}>{cur?.name}</span>
              <span className={styles.infoK}>{t('info.convs')}</span>
              <span className={styles.infoV}>{cur ? fmt.number(cur.convs) : null}</span>
              <span className={styles.infoK}>{t('info.frt')}</span>
              <span className={styles.infoV}>{cur?.frt}</span>
              <span className={styles.infoK}>{t('info.agent')}</span>
              <span className={styles.infoV}>{cur?.agent || '—'}</span>
            </div>
            <div className={styles.testRow}>
              <button type="button" className={s.ghost} onClick={() => void test.run({ channel_account_id: account.id })} data-testid="st-ch-drawer-check">
                {t('check')}
              </button>
              <button
                type="button"
                className={s.ghost}
                onClick={() => void resync.run({ channel_account_id: account.id, history_days: account.history_days })}
                data-testid="st-ch-drawer-resync"
              >
                {t('resync')}
              </button>
            </div>
          </div>

          <div className={styles.block}>
            <div className={styles.blockT}>{t('s2')}</div>
            <div className={styles.statGrid}>
              <div>
                <div className={styles.statL}>{t('stat.convs')}</div>
                <div className={styles.statV}>{stats?.total_convs ?? '—'}</div>
              </div>
              <div>
                <div className={styles.statL}>{t('stat.frt')}</div>
                <div className={styles.statV}>{account.frt}</div>
              </div>
              <div>
                <div className={styles.statL}>{t('stat.resolve')}</div>
                <div className={styles.statV}>{stats ? Math.round(stats.days.reduce((n, d) => n + d.convs, 0) * 0.8) : '—'}</div>
              </div>
            </div>
          </div>

          <div className={styles.block}>
            <div className={styles.blockT}>{t('s3')}</div>
            <div>
              <div className={s.label}>{t('info.agent')}</div>
              <select className={s.select} value={cur?.agent_id ?? ''} onChange={(e) => patch({ agent_id: e.target.value })} data-testid="st-ch-drawer-agent">
                <option value="">—</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className={s.label}>{t('aiMode')}</div>
              <div className={styles.seg}>
                {MODES.map((m) => (
                  <button key={m} type="button" className={cx(styles.segBtn, cur?.ai_mode === m && styles.segOn)} onClick={() => patch({ ai_mode: m })} aria-pressed={cur?.ai_mode === m} data-testid={`st-ch-drawer-mode-${m}`}>
                    {t(`mode.${m}` as never)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className={s.label}>{t('hours')}</div>
              <input className={s.input} value={cur?.hours ?? ''} onChange={(e) => patch({ hours: e.target.value })} data-testid="st-ch-drawer-hours" />
            </div>
            <div>
              <div className={s.label}>{t('greeting')}</div>
              <textarea className={s.input} value={cur?.greeting ?? ''} onChange={(e) => patch({ greeting: e.target.value })} rows={3} data-testid="st-ch-drawer-greeting" />
            </div>
          </div>

          {/* TIP-022b: lịch có cấu trúc + lời chào + phân luồng từ khoá — khối tự lưu (ChannelRoutingSettings). */}
          {account ? <ChannelRoutingSettings key={account.id} account={account} /> : null}
          <div className={styles.block}>
            <div className={styles.blockT}>{t('s4')}</div>
            <div className={styles.grid2}>
              <ChannelRoutingFields routing={account?.routing} legacy={account?.assign_mode} testId="st-ch-drawer-routing" />
              <div>
                <div className={s.label}>{t('slaPolicy')}</div>
                <select className={s.select} value={resolveSlaPolicyId(cur?.sla_policy, slaPolicies)} onChange={(e) => patch({ sla_policy: e.target.value })} data-testid="st-ch-drawer-sla">
                  {slaPolicies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.is_default ? t('slaDefaultFmt', { frt: p.frt_human, ttr: p.ttr_human }) : t('slaFmt', { n: p.name, frt: p.frt_human, ttr: p.ttr_human })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className={styles.block}>
            <div className={styles.blockT}>{t('s5')}</div>
            <div className={styles.syncRow}>
              <div className={styles.acctBody}>
                <div className={styles.syncLbl}>{t('syncMessages')}</div>
                <div className={styles.syncD}>{t('syncMessagesD')}</div>
              </div>
              <Switch on={!!cur?.sync_messages} onChange={(v) => patch({ sync_messages: v })} label={t('syncMessages')} testId="st-ch-drawer-sync-msg" />
            </div>
            <div className={styles.syncRow}>
              <div className={styles.acctBody}>
                <div className={styles.syncLbl}>{t('syncContact')}</div>
                <div className={styles.syncD}>{t('syncContactD')}</div>
              </div>
              <Switch on={!!cur?.sync_auto_create_contact} onChange={(v) => patch({ sync_auto_create_contact: v })} label={t('syncContact')} testId="st-ch-drawer-sync-contact" />
            </div>
            <div className={styles.syncRow}>
              <div className={cx(styles.syncLbl, styles.syncGrow)}>{t('historyLabel')}</div>
              <select
                className={cx(s.select, styles.historySelect)}
                value={cur?.history_days}
                onChange={(e) => patch({ history_days: Number(e.target.value) as ChannelHistoryDays })}
                data-testid="st-ch-drawer-history"
              >
                {HISTORIES.map((d) => (
                  <option key={d} value={d}>
                    {t(`history.${d}` as never)}
                  </option>
                ))}
              </select>
            </div>
            <ChannelRateFields value={cur ?? {}} onChange={patch} />
            {/* Danh bạ / bạn bè theo capability của kênh (TIP-014c — không rẽ nhánh cứng theo loại kênh). */}
            {hasOp(c.capabilities?.operations, OP_PROFILES) && account.connected && !account.paused ? <ContactSyncPanel accountId={account.id} /> : null}
            {hasOp(c.capabilities?.operations, OP_FRIEND_REQUESTS) && account.connected && !account.paused ? <FriendsPanel accountId={account.id} /> : null}
          </div>

          <div className={cx(styles.block, styles.blockDanger)}>
            <div className={cx(styles.blockT, styles.blockTDanger)}>{t('s6')}</div>
            <div className={styles.dangerRow}>
              <div className={styles.acctBody}>
                <div className={styles.dangerTitle}>{account.paused ? t('resume') : t('pause')}</div>
                <div className={styles.dangerD}>{t('pauseD')}</div>
              </div>
              <button
                type="button"
                className={s.ghost}
                onClick={() => void (account.paused ? resume.run({ channel_account_id: account.id }) : pause.run({ channel_account_id: account.id }))}
                data-testid="st-ch-drawer-pause"
              >
                {account.paused ? t('resume') : t('pause')}
              </button>
            </div>
            <div className={styles.dangerRow}>
              <div className={styles.acctBody}>
                <div className={styles.dangerTitle}>{t('reconnectOther')}</div>
                <div className={styles.dangerD}>{t('reconnectOtherD')}</div>
              </div>
              <button
                type="button"
                className={s.ghost}
                onClick={() => {
                  close();
                  set({ channelWizard: { type: c.type, step: 2, accountId: account.id } });
                }}
                data-testid="st-ch-drawer-reconnect"
              >
                {t('reconnectBtn')}
              </button>
            </div>
            <div className={styles.dangerRow}>
              <div className={styles.acctBody}>
                <div className={cx(styles.dangerTitle, styles.dangerTitleRed)}>{t('disconnectTitle')}</div>
                <div className={styles.dangerD}>{t('disconnectD')}</div>
              </div>
              <button type="button" className={s.dangerGhost} onClick={() => void doDisconnect()} data-testid="st-ch-drawer-disconnect">
                {t('disconnectBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </EntityDrawer>
  );
}
