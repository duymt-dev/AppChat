// Popover của ô soạn: Trả lời nhanh · Đặt lịch hẹn (AI gợi ý khung giờ) · Dịch tự động · menu ＋ (REQ-C11) — prototype L1801–1868, L653.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Icon, color } from '@appchat/ui';
import { agentsQuery } from '@/features/agents';
import { channelsQuery, connectorsQuery } from '@/features/settings';
import { connectorBadge, connectorStatus, groupToolsByModule, MODULE_ACTIONS, SKILL_ACTIONS } from '@/shared/ai/agent-tools';
import { useComposerStyles } from '../styles/composer.styles';
import { usePopStyles } from '../styles/popover.styles';
import { useInboxStyles } from '../styles/inbox.styles';
import { useInboxUi } from '../inbox-store';
import { cannedQuery, slotsQuery } from '../api';
import type { Conversation } from '../types';

const LANGS = ['English', '中文', '한국어', '日本語'] as const;

export function ComposerPopovers({ conv, customer, onInsert }: { conv: Conversation; customer: string; onInsert: (text: string) => void }) {
  const t = useTranslations('inbox.composer');
  const tc = useTranslations('common');
  const router = useRouter();
  const { styles, cx } = useComposerStyles();
  const { styles: ps } = usePopStyles();
  const { styles: base } = useInboxStyles();
  const ui = useInboxUi();
  const agents = useQuery({ ...agentsQuery(), enabled: ui.pop === 'attach' });
  const channels = useQuery({ ...channelsQuery('all'), enabled: ui.pop === 'attach' }).data ?? [];
  const connectors = useQuery({ ...connectorsQuery(), enabled: ui.pop === 'attach' }).data ?? [];
  const { known, connected } = connectorStatus({ channels, connectors });
  /** Agent phụ trách hội thoại chưa gắn `assignee_agent_id` ở FE — tạm lấy agent nhận kênh này làm đại diện (REQ-C11). */
  const repAgent = (agents.data?.data ?? []).find((a) => a.channels.includes(conv.channel)) ?? agents.data?.data[0];
  const grantedIds = repAgent?.tools ?? [];
  const groups = groupToolsByModule(MODULE_ACTIONS.filter((a) => grantedIds.includes(a.id)), grantedIds);
  const skillGroup = groupToolsByModule(SKILL_ACTIONS.filter((a) => grantedIds.includes(a.id)), grantedIds)[0];
  const canned = useQuery({ ...cannedQuery(), enabled: ui.pop === 'qr' });
  const slots = useQuery({ ...slotsQuery(), enabled: ui.pop === 'sched' });
  const [slot, setSlot] = useState(0);
  const [lang, setLang] = useState(0);
  if (ui.pop !== 'qr' && ui.pop !== 'sched' && ui.pop !== 'xl' && ui.pop !== 'attach') return null;

  return (
    <>
      <div className={base.veil} onClick={ui.closePop} />
      {ui.pop === 'attach' ? (
        <div className={cx(ps.pop, ps.popNarrow)} data-testid="attach-pop">
          <div className={ps.popBody}>
            <button type="button" className={cx(ps.slot)} onClick={ui.closePop}>
              <Icon name="ic-doc" size={15} color={color.text3} />
              <span className={styles.grow}>{t('attachMenu.file')}</span>
            </button>
            <button type="button" className={cx(ps.slot)} onClick={ui.closePop}>
              <Icon name="ic-image" size={15} color={color.text3} />
              <span className={styles.grow}>{t('attachMenu.screenshot')}</span>
            </button>
            <div className={ps.popHint}>{t('attachMenu.agentTools')}</div>
            {groups.map((g) => (
              <div key={g.key} className={ps.slot} style={{ cursor: 'default' }}>
                <span className={styles.grow}>
                  <div className={ps.qrTitle}>
                    {tc(`modules.${g.key}` as never)} <span className={ps.popHint}>{t('attachMenu.count', { on: g.grantedCount, total: g.actions.length })}</span>
                  </div>
                  <div className={ps.qrPreview}>
                    {g.actions
                      .map((a) => {
                        const badge = connectorBadge(a, connected, known);
                        return badge ? `${t(a.title as never)} (${t(`attachMenu.${badge}` as never)})` : t(a.title as never);
                      })
                      .join(' · ')}
                  </div>
                </span>
              </div>
            ))}
            {skillGroup ? (
              <div className={ps.slot} style={{ cursor: 'default' }} data-testid="attach-skill-group">
                <span className={styles.grow}>
                  <div className={ps.qrTitle}>{t('attachMenu.skillGroup')}</div>
                  <div className={ps.qrPreview}>{skillGroup.actions.map((a) => `/${a.id} — ${t(a.title as never)}`).join(' · ')}</div>
                </span>
              </div>
            ) : null}
            {!groups.length && !skillGroup ? <div className={ps.popHint}>{t('attachMenu.noTools')}</div> : null}
            <button type="button" className={ps.slot} disabled>
              <Icon name="ic-globe" size={15} color={color.text4} />
              <span className={styles.grow}>{t('attachMenu.research')}</span>
              <span className={styles.conf}>{t('attachMenu.soon')}</span>
            </button>
            <button type="button" className={cx(ps.slot, ps.builderLink)} onClick={() => router.push(`/agents/${repAgent?.id ?? ''}`)}>
              <Icon name="ic-arrow" size={13} color={color.brandInk} />
              <span className={styles.grow}>{t('attachMenu.editInBuilder')}</span>
            </button>
          </div>
        </div>
      ) : null}
      {ui.pop === 'qr' ? (
        <div className={ps.pop} data-testid="qr-pop">
          <div className={ps.popHead}>
            <Icon name="ic-bolt" size={16} color={color.amberGold} />
            {t('qr.title')}
            <span className={ps.popHint}>{t('qr.hint')}</span>
          </div>
          <div className={ps.popBody}>
            {(canned.data ?? []).map((g) => (
              <div key={g.group} className={styles.actions}>
                <div className={ps.popHint}>{g.group}</div>
                <div className={ps.grid2}>
                  {g.items.map(([cmd, title, body]) => (
                    <button key={cmd} type="button" className={ps.qr} onClick={() => onInsert(body.replace('{tên}', customer))}>
                      <span className={ps.qrCmd}>{cmd}</span>
                      <span className={ps.qrTitle}>{title}</span>
                      <div className={ps.qrPreview}>{body}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {ui.pop === 'sched' ? (
        <div className={cx(ps.pop, ps.popNarrow)} data-testid="sched-pop">
          <div className={ps.popHead}>
            <Icon name="ic-cal" size={16} color={color.calText} />
            {t('sched.title', { name: customer })}
          </div>
          <div className={ps.popBody}>
            <div className={ps.popHint}>{t('sched.ai')}</div>
            {(slots.data ?? []).map((s, i) => (
              <button key={s.time + s.day} type="button" className={cx(ps.slot, slot === i && ps.slotOn)} onClick={() => setSlot(i)}>
                <span className={ps.qrTitle}>{`${s.day} ${s.mon}`}</span>
                <span className={styles.grow}>
                  <div className={ps.qrTitle}>{s.time}</div>
                  <div className={ps.qrPreview}>{s.staff}</div>
                </span>
                <span className={styles.conf}>{s.best ? t('sched.best') : t('sched.fit')}</span>
              </button>
            ))}
            <button
              type="button"
              className={styles.primary}
              onClick={() => {
                const s = slots.data?.[slot];
                if (s) onInsert(t('sched.confirm', { day: `${s.day} ${s.mon}`, time: s.time }));
              }}
            >
              <Icon name="ic-cal" size={15} color={color.white} />
              {t('sched.send')}
            </button>
          </div>
        </div>
      ) : null}
      {ui.pop === 'xl' ? (
        <div className={cx(ps.pop, ps.popRight)} data-testid="xl-pop">
          <div className={ps.popHead}>
            <Icon name="ic-globe" size={16} color={color.blue} />
            {t('xl.title')}
          </div>
          <div className={ps.popBody}>
            <button type="button" className={cx(ps.slot, ui.autoXl && ps.slotOn)} aria-pressed={ui.autoXl} onClick={() => ui.set({ autoXl: !ui.autoXl })}>
              <span className={styles.grow}>
                <div className={ps.qrTitle}>{t('xl.auto')}</div>
                <div className={ps.qrPreview}>{t('xl.autoHint')}</div>
              </span>
            </button>
            <div className={ps.popHint}>{t('xl.to')}</div>
            <div className={styles.actions}>
              {LANGS.map((l, i) => (
                <button key={l} type="button" className={cx(ps.lang, lang === i && ps.langOn)} onClick={() => setLang(i)}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
