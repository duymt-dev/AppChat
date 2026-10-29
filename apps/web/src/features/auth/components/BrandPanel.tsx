// Nửa phải màn auth — prototype L613–631. Ẩn dưới xl (prototype ẩn < 1100px).
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { createStyles } from 'antd-style';
import { color, font, gradient, mq, radius, shadow } from '@appchat/ui';
import { authBrandQuery } from '../api';

const useStyles = createStyles(({ css }) => ({
  side: css`
    position: relative;
    overflow: hidden;
    background: ${gradient.authBrand};
    color: ${color.white};
    padding: 56px 60px;
    display: flex;
    flex-direction: column;
    ${mq.auth} {
      display: none;
    }
  `,
  glowTop: css`
    position: absolute;
    top: -120px;
    right: -120px;
    width: 420px;
    height: 420px;
    border-radius: 50%;
    background: ${gradient.authGlowTop};
  `,
  glowBottom: css`
    position: absolute;
    bottom: -160px;
    left: -80px;
    width: 380px;
    height: 380px;
    border-radius: 50%;
    background: ${gradient.authGlowBottom};
  `,
  grid: css`
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0.08;
  `,
  inner: css`
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
  `,
  eyebrow: css`
    font-size: ${font.size.step}px;
    letter-spacing: 0.2em;
    opacity: 0.85;
    font-weight: ${font.weight.bold};
    margin-bottom: 24px;
  `,
  headline: css`
    font-size: ${font.size.display}px;
    font-weight: ${font.weight.heavy};
    line-height: 1.1;
    letter-spacing: -1px;
    margin-bottom: 16px;
    & span {
      background: ${gradient.authHeadline};
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  `,
  lead: css`
    font-size: ${font.size.upgrade}px;
    opacity: 0.88;
    line-height: 1.6;
    max-width: 420px;
    margin-bottom: 40px;
  `,
  slogan: css`
    font-size: ${font.size.slogan}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: -0.3px;
    margin: -24px 0 40px;
    color: ${color.mint};
  `,
  card: css`
    background: ${color.glass};
    backdrop-filter: blur(12px);
    border: 1px solid ${color.glassLine};
    border-radius: ${radius.card}px;
    padding: 18px;
    margin-bottom: 24px;
    box-shadow: ${shadow.glass};
  `,
  cardHead: css`
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  `,
  avatar: css`
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: ${color.avatarMint};
    display: grid;
    place-items: center;
    font-weight: ${font.weight.heavy};
  `,
  name: css`
    font-weight: ${font.weight.bold};
    font-size: ${font.size.body}px;
  `,
  meta: css`
    font-size: ${font.size.step}px;
    opacity: 0.75;
  `,
  tag: css`
    font-size: ${font.size.tag}px;
    padding: 3px 6px;
    background: ${color.glass3};
    border-radius: ${radius.xs}px;
  `,
  msg: css`
    background: ${color.glass2};
    padding: 10px 12px;
    border-radius: 4px 14px 14px 14px;
    font-size: ${font.size.body}px;
    margin-bottom: 10px;
  `,
  ai: css`
    display: flex;
    gap: 6px;
    align-items: center;
    font-size: ${font.size.small}px;
    background: ${color.aiChipBg};
    border: 1px solid ${color.aiChipLine};
    padding: 8px 10px;
    border-radius: ${radius.md}px;
  `,
  aiMark: css`
    width: 16px;
    height: 16px;
    border-radius: 4px;
    background: ${color.white};
    display: grid;
    place-items: center;
    color: ${color.brand};
    font-size: ${font.size.tag}px;
    font-weight: 900;
  `,
  stats: css`
    margin-top: auto;
    display: flex;
    gap: 24px;
    font-size: ${font.size.body}px;
  `,
  statV: css`
    font-size: ${font.size.stat}px;
    font-weight: ${font.weight.heavy};
  `,
  grow: css`
    flex: 1;
  `,
  statL: css`
    opacity: 0.8;
  `,
}));

export function BrandPanel() {
  const t = useTranslations('auth.brand');
  const { styles } = useStyles();
  const { data } = useQuery(authBrandQuery());
  return (
    <aside className={styles.side} aria-hidden="true">
      <div className={styles.glowTop} />
      <div className={styles.glowBottom} />
      <svg className={styles.grid}>
        <defs>
          <pattern id="authgrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#authgrid)" />
      </svg>
      <div className={styles.inner}>
        <div className={styles.eyebrow}>{t('eyebrow')}</div>
        <div className={styles.headline}>
          {t('headline1')}
          <br />
          {t('headline2')}
          <br />
          {'→ '}
          <span>{t('headline3')}</span>
        </div>
        <div className={styles.lead}>{t('lead')}</div>
        <div className={styles.slogan}>{t('slogan')}</div>
        {data ? (
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <div className={styles.avatar}>{data.card.initials}</div>
              <div className={styles.grow}>
                <div className={styles.name}>{data.card.name}</div>
                <div className={styles.meta}>{data.card.meta}</div>
              </div>
              <span className={styles.tag}>{data.card.tag}</span>
            </div>
            <div className={styles.msg}>{data.card.message}</div>
            <div className={styles.ai}>
              <div className={styles.aiMark}>{t('aiMark')}</div>
              <span>{data.card.ai}</span>
            </div>
          </div>
        ) : null}
        <div className={styles.stats}>
          {data?.stats.map((s) => (
            <div key={s.l}>
              <div className={styles.statV}>{s.v}</div>
              <div className={styles.statL}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
