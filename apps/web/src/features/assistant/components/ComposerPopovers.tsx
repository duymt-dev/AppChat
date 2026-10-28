// Popover của composer — prototype L640–676: menu "+" (Chat / Cowork), chọn mức AI (D29: không hiện tên model), chọn AI Agent.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Icon, color, layout, type IconName } from '@appchat/ui';
import { useComposerStyles } from '../styles/composer.styles';
import { useAssistantUi } from '../assistant-store';
import { homeQuery } from '../api';
import type { Tier } from '../types';

const TIERS: Tier[] = ['max', 'advanced', 'standard'];
const CHAT_ITEMS: [IconName, string, boolean][] = [
  ['ic-doc', 'file', true],
  ['ic-grid', 'screenshot', false],
  ['ic-globe', 'channels', false],
  ['ic-cog', 'integrations', false],
  ['ic-search', 'research', false],
  ['ic-flow', 'search', false],
];
const COWORK_ITEMS: [IconName, string][] = [
  ['ic-doc', 'fileShort'],
  ['ic-globe', 'channels'],
  ['ic-cog', 'integrations'],
  ['ic-bot', 'pickAgent'],
  ['ic-plus', 'newAgent'],
];
const ROUTE: Record<string, string> = { channels: '/settings/channels', integrations: '/settings/integrations', newAgent: '/agents/new' };

export function ComposerPopovers() {
  const t = useTranslations('assistant');
  const router = useRouter();
  const { styles } = useComposerStyles();
  const ui = useAssistantUi();
  const agents = useQuery(homeQuery()).data?.cowork_cards ?? [];
  if (!ui.pop) return null;
  const close = () => ui.set({ pop: null });
  const pick = (key: string) => {
    if (key === 'pickAgent') return ui.set({ pop: 'agent' });
    close();
    if (ROUTE[key]) router.push(ROUTE[key]);
  };
  const left = ui.pop === 'tier' ? Math.max(12, ui.popAnchor.right - layout.popTier) : ui.popAnchor.left;
  const width = ui.pop === 'plus' ? layout.popPlus : ui.pop === 'tier' ? layout.popTier : layout.popAgent;

  return (
    <>
      <div className={styles.veil} onClick={close} />
      <div className={styles.pop} style={{ left, bottom: ui.popAnchor.bottom, width }} data-testid={`asst-pop-${ui.pop}`} role="menu">
        {ui.pop === 'plus' && ui.mode === 'chat'
          ? CHAT_ITEMS.map(([ic, key, kbd]) => (
              <button key={key} type="button" role="menuitem" className={styles.popRow} onClick={() => pick(key)}>
                <Icon name={ic} size={16} color={color.text3} />
                <span className={styles.popLabel}>{t(`plus.${key}` as never)}</span>
                {kbd ? <span className={styles.popKey}>{t('plus.fileKey')}</span> : null}
              </button>
            ))
          : null}
        {ui.pop === 'plus' && ui.mode === 'cowork' ? (
          <>
            <div className={styles.popHead}>{t('plus.coworkTitle')}</div>
            {COWORK_ITEMS.map(([ic, key]) => (
              <button key={key} type="button" role="menuitem" className={styles.popRow} onClick={() => pick(key)}>
                <Icon name={ic} size={16} color={color.text3} />
                <span className={styles.popLabel}>{t(`plus.${key}` as never)}</span>
              </button>
            ))}
          </>
        ) : null}
        {ui.pop === 'tier' ? (
          <>
            {TIERS.map((k) => (
              <button key={k} type="button" role="menuitemradio" aria-checked={ui.tier === k} className={styles.popRow} onClick={() => ui.set({ tier: k, pop: null })}>
                <div className={styles.grow}>
                  <div className={styles.tierName}>{t(`tier.${k}`)}</div>
                  <div className={styles.tierDesc}>{t(`tier.${k}Desc`)}</div>
                </div>
                <span className={styles.check}>{ui.tier === k ? t('tier.check') : ''}</span>
              </button>
            ))}
            <div className={styles.popSep} />
            <div className={styles.popRow}>
              <span className={styles.popLabel}>{t('tier.effort')}</span>
              <span className={styles.popMeta}>{t('tier.effortMore')}</span>
            </div>
          </>
        ) : null}
        {ui.pop === 'agent' ? (
          <>
            <div className={styles.popHead}>{t('agentPick')}</div>
            {agents.map((a) => (
              <button key={a.id} type="button" role="menuitemradio" aria-checked={ui.agent === a.name} className={styles.popRow} onClick={() => ui.set({ agent: a.name, pop: null })}>
                <Icon name="ic-bot" size={15} color={color.violet} strokeWidth={1.9} />
                <span className={styles.popLabel}>{t('agentSuffix', { name: a.name })}</span>
                <span className={styles.check}>{ui.agent === a.name ? t('tier.check') : ''}</span>
              </button>
            ))}
          </>
        ) : null}
      </div>
    </>
  );
}
