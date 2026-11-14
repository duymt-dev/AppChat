// Hero kênh (Email · Zalo cá nhân · Automation) — prototype L3410–3455: tiêu đề + mô tả + "Soạn chiến dịch …", 4 chỉ số kênh,
// thẻ A/B Testing và Lịch gửi sắp tới. "Soạn" mở wizard với kênh tương ứng. Chỉ số là khoá (FE dịch) + số đo thật (TIP-037).
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useHeroStyles } from '../styles/hero.styles';
import { useMarketingUi } from '../marketing-store';
import { useFmt } from '@/shared/i18n/useFmt';
import { CHANNEL_LOOK } from '../status';
import type { ChanTab, MarketingMeta } from '../types';

const HERO_TONE: Record<Exclude<ChanTab, 'all'>, string> = {
  email: color.amberGold,
  zalo: color.zalo,
  auto: color.violet,
};

export function ChannelHero({ meta, chan }: { meta: MarketingMeta; chan: Exclude<ChanTab, 'all'> }) {
  const t = useTranslations('marketing');
  const { styles } = useHeroStyles();
  const fmt = useFmt();
  const set = useMarketingUi((s) => s.set);
  const c = HERO_TONE[chan];
  const compose = () =>
    set({ wizard: true, fromSuggestion: null, prefill: chan === 'auto' ? null : { channel: chan } });
  return (
    <>
      <div className={styles.hero} style={{ background: `linear-gradient(135deg,${c}0E,${color.white})` }} data-testid="mk-hero">
        <div className={styles.heroTop}>
          <div className={styles.min0}>
            <div className={styles.heroT}>{t(`hero.${chan}.title`)}</div>
            <div className={styles.heroD}>{t(`hero.${chan}.desc`)}</div>
          </div>
          <button type="button" className={styles.compose} style={{ background: c }} onClick={compose} data-testid="mk-hero-compose">
            <Icon name="ic-plus" size={15} color={color.white} strokeWidth={2.2} />
            {chan === 'auto' ? t('hero.flow') : t('hero.compose', { name: t(`hero.${chan}.title`) })}
          </button>
        </div>
        <div className={styles.grid4}>
          {meta.hero[chan].map(([l, v]) => (
            <div key={l} className={styles.stat}>
              <div className={styles.statL}>{t(`hero.stat.${l}` as never)}</div>
              <div className={styles.statV}>{/^\d+$/.test(v) ? fmt.number(Number(v)) : v}</div>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.two}>
        <div className={styles.card}>
          <div className={styles.cardH}>
            <Icon name="ic-flow" size={16} color={color.violet} />
            <span className={styles.cardT}>{t('hero.ab')}</span>
            <span className={styles.grow} />
            <span className={styles.cardN}>{t('hero.abCount', { n: meta.ab_tests.length })}</span>
          </div>
          <div className={styles.col}>
            {meta.ab_tests.length ? null : <div className={styles.schS}>{t('hero.abNone')}</div>}
            {meta.ab_tests.map(([title, tone, a, b, verdict]) => (
              <div key={title} className={styles.ab}>
                <div className={styles.abT}>{title}</div>
                <div className={styles.abRow}>
                  <div className={styles.abV}>
                    <div className={styles.abK}>{t('hero.varA')}</div>
                    <div className={styles.abN}>{a}</div>
                  </div>
                  <div className={styles.abV} style={{ borderColor: tone, background: `${tone}0E` }}>
                    <div className={styles.abK} style={{ color: tone }}>
                      {t('hero.varB')}
                    </div>
                    <div className={styles.abN}>{b}</div>
                  </div>
                </div>
                <div className={styles.abW}>{`✓ ${verdict}`}</div>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardH}>
            <Icon name="ic-cal" size={16} color={color.blue} />
            <span className={styles.cardT}>{t('hero.upcoming')}</span>
          </div>
          <div className={styles.colS}>
            {meta.schedule.length ? null : <div className={styles.schS}>{t('hero.upcomingNone')}</div>}
            {meta.schedule.map(([when, name, ch, seg]) => {
              const tone = CHANNEL_LOOK[ch][0];
              return (
                <div key={name} className={styles.sch}>
                  <span className={styles.dot} style={{ background: tone }} />
                  <div className={styles.min0}>
                    <div className={styles.schN}>{name}</div>
                    <div className={styles.schS}>{`${t(`chan.${ch}`)} · ${t('hero.recipients', { n: fmt.number(Number(seg)) })}`}</div>
                  </div>
                  <span className={styles.schW} style={{ color: tone }}>
                    {when ? `${fmt.date(when)} · ${fmt.time(when)}` : t('hero.whenApproved')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
