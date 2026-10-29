// Kênh hoạt động (channel registry — chỉ Zalo cá nhân / Web chat / Email) + Phân luồng: intent, từ khoá, khung giờ — prototype L2338–2363.
'use client';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useBuilderStyles } from '../../styles/builder.styles';
import { useSectionStyles } from '../../styles/sections.styles';
import type { AgentsMeta } from '../../types';
import type { SectionProps } from './BasicsSection';

const HOURS = ['always', 'office', 'custom'] as const;

export function RoutingSection({ cfg, toggle, meta }: Pick<SectionProps, 'cfg'> & { meta: AgentsMeta; toggle: (k: 'intents' | 'channels', v: number | string) => void }) {
  const t = useTranslations('agents.b');
  const router = useRouter();
  const { styles: bs, cx } = useBuilderStyles();
  const { styles } = useSectionStyles();

  return (
    <>
      <div className={bs.sec}>
        <div className={bs.h}>{t('channels')}</div>
        <div className={bs.hSub}>{t('channelsSub')}</div>
        <div className={styles.chips}>
          {meta.channels.map((ch) => {
            const on = cfg.channels.includes(ch.key);
            return (
              <button
                key={ch.key}
                type="button"
                aria-pressed={on}
                className={cx(styles.chip, on && styles.chOn)}
                onClick={() => toggle('channels', ch.key)}
                data-channel={ch.key}
              >
                <span className={styles.dot} style={{ background: ch.color }} />
                {t(`channel.${ch.key}` as never)}
                {on ? <Icon name="ic-check" size={13} color={color.brand} strokeWidth={2.4} /> : null}
              </button>
            );
          })}
          <button type="button" className={cx(styles.chip, styles.connect)} onClick={() => router.push('/settings/channels')}>
            <Icon name="ic-plus" size={13} color={color.brand} strokeWidth={2.4} />
            {t('connect')}
          </button>
        </div>
      </div>
      <div className={bs.sec}>
        <div className={bs.h}>{t('routing')}</div>
        <div className={bs.hSub}>{t('routingSub')}</div>
        <div className={bs.label}>{t('intents')}</div>
        <div className={cx(styles.chips, styles.intentsGap)}>
          {meta.intents.map((l, i) => {
            const on = cfg.intents.includes(i);
            return (
              <button key={l} type="button" aria-pressed={on} className={cx(styles.chip, on && styles.intentOn)} onClick={() => toggle('intents', i)} data-intent={i}>
                {l}
              </button>
            );
          })}
        </div>
        <div className={bs.label}>{t('keywords')}</div>
        <input className={bs.field} defaultValue={t('keywordsVal')} aria-label={t('keywords')} />
        <div className={bs.help}>{t('keywordsHint')}</div>
        <div className={styles.learn}>
          <div className={bs.label}>{t('hours')}</div>
          <select className={bs.field} aria-label={t('hours')}>
            {HOURS.map((k) => (
              <option key={k} value={k}>
                {t(`hoursOpt.${k}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}
