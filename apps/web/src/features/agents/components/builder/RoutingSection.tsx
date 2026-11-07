// Kênh hoạt động (channel registry — chỉ Zalo cá nhân / Web chat / Email) + Phân luồng: intent, từ khoá ưu tiên, khung giờ hoạt động
// (lưu vào cấu hình agent — TIP-024; lịch tuần có cấu trúc — TIP-022b WeeklyScheduleEditor) — prototype L2338–2363.
'use client';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useBuilderStyles } from '../../styles/builder.styles';
import { useSectionStyles } from '../../styles/sections.styles';
import type { AgentsMeta } from '../../types';
import { WeeklyScheduleEditor } from './WeeklyScheduleEditor';
import { BindingPreview } from './BindingPreview';
import type { SectionProps } from './BasicsSection';

/** "spa, giá, lịch hẹn" → mảng từ khoá (bỏ trống, trùng; ≤ 20 — giới hạn của action). */
const splitKeywords = (v: string) => [...new Set(v.split(',').map((k) => k.trim()).filter(Boolean))].slice(0, 20);

export function RoutingSection({ cfg, patch, toggle, meta, agentId }: SectionProps & { meta: AgentsMeta; agentId?: string; toggle: (k: 'intents' | 'channels', v: number | string) => void }) {
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
        <BindingPreview agentId={agentId} types={cfg.channels} />
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
        <input
          className={bs.field}
          defaultValue={cfg.keywords.join(', ')}
          placeholder={t('keywordsVal')}
          onBlur={(e) => patch({ keywords: splitKeywords(e.target.value) })}
          aria-label={t('keywords')}
          data-testid="agb-keywords"
        />
        <div className={bs.help}>{t('keywordsHint')}</div>
        <div className={styles.learn}>
          <WeeklyScheduleEditor cfg={cfg} patch={patch} />
        </div>
      </div>
    </>
  );
}
