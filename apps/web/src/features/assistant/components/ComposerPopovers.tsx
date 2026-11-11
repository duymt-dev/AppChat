// Popover của composer — prototype L640–676: menu "+" (Chat / Cowork — hàng nguồn đầu vào ở InputSourcePicker), chọn mức AI (D29: không
// hiện tên model), chọn AI Agent.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Icon, color, layout } from '@appchat/ui';
import { useComposerStyles } from '../styles/composer.styles';
import { useAssistantUi } from '../assistant-store';
import { homeQuery } from '../api';
import { UtilityMenu } from '@/shared/ai-utilities';
import { InputSourcePicker } from './InputSourcePicker';
import type { Tier } from '../types';

const TIERS: Tier[] = ['max', 'advanced', 'standard'];
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
  const width = ui.pop === 'plus' || ui.pop === 'utility' ? layout.popPlus : ui.pop === 'tier' ? layout.popTier : layout.popAgent;

  return (
    <>
      <div className={styles.veil} onClick={close} />
      <div className={styles.pop} style={{ left, bottom: ui.popAnchor.bottom, width }} data-testid={`asst-pop-${ui.pop}`} role="menu">
        {ui.pop === 'plus' ? <InputSourcePicker mode={ui.mode} onPick={pick} /> : null}
        {ui.pop === 'utility' ? <UtilityMenu title={t('quick')} onSelect={(id) => ui.set({ utility: id, pop: null })} /> : null}
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
              <button key={a.id} type="button" role="menuitemradio" aria-checked={ui.agent?.id === a.id} disabled={a.status !== 'active'} className={styles.popRow} onClick={() => ui.set({ agent: { id: a.id, name: a.name }, pop: null })}>
                <Icon name="ic-bot" size={15} color={color.violet} strokeWidth={1.9} />
                <span className={styles.popLabel}>{t('agentSuffix', { name: a.name })}</span>
                <span className={styles.check}>{ui.agent?.id === a.id ? t('tier.check') : ''}</span>
              </button>
            ))}
          </>
        ) : null}
      </div>
    </>
  );
}
