// Modal "Kết nối kênh mới" — prototype L1548–1582. Chỉ kênh có manifest kết nối được; còn lại thẻ "Sắp có" (prototype-parity §6, D28).
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useModalStyles } from '../styles/modal.styles';
import { useInboxUi } from '../inbox-store';
import { connectChannelsQuery } from '../api';

const CATS = ['all', 'social', 'web'] as const;
const INDUSTRIES = ['fashion', 'beauty', 'fnb'] as const;

export function ConnectChannelModal() {
  const t = useTranslations('inbox.connect');
  const router = useRouter();
  const { styles, cx } = useModalStyles();
  const ui = useInboxUi();
  const list = useQuery(connectChannelsQuery()).data ?? [];
  const [cat, setCat] = useState<(typeof CATS)[number]>('all');
  const close = () => ui.set({ modal: null });
  const inCat = (k: (typeof CATS)[number]) => list.filter((c) => k === 'all' || c.cat === k);
  const shown = inCat(cat);

  return (
    <div className={styles.veil} onClick={close} data-testid="connect-modal">
      <div className={styles.box} role="dialog" aria-modal="true" aria-label={t('title')} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <div className={styles.grow}>
            <div className={styles.eyebrow}>{t('eyebrow')}</div>
            <div className={styles.title}>{t('title')}</div>
          </div>
          <span className={styles.meta}>{t('meta', { n: list.length })}</span>
          <button type="button" className={styles.x} onClick={close} aria-label={t('close')}>
            <Icon name="ic-x" size={18} color={color.text3} />
          </button>
        </div>
        <div className={styles.body}>
          <div className={styles.side}>
            {CATS.map((k) => (
              <button key={k} type="button" className={cx(styles.cat, cat === k && styles.catOn)} onClick={() => setCat(k)}>
                <span className={styles.grow}>{t(`cats.${k}`)}</span>
                <span className={styles.catCount}>{inCat(k).length}</span>
              </button>
            ))}
            <div className={styles.sideHead}>{t('byIndustry')}</div>
            {INDUSTRIES.map((k) => t(`industries.${k}`)).map((n) => (
              <button key={n} type="button" className={cx(styles.cat, styles.catSm)}>
                {n}
              </button>
            ))}
          </div>
          <div className={styles.main}>
            <div className={styles.grid}>
              {shown.map((c) => {
                const soon = c.status === 'coming_soon';
                return (
                  <button
                    key={c.type}
                    type="button"
                    className={styles.card}
                    aria-disabled={soon}
                    data-testid={`connect-${c.type}`}
                    onClick={() => (soon ? undefined : router.push(`/settings/channels?connect=${c.type}`))}
                  >
                    <div className={styles.cardTop}>
                      <span className={styles.logo} style={{ background: c.color }}>
                        {c.short}
                      </span>
                      <div className={styles.grow}>
                        <div className={styles.name}>{c.name}</div>
                        <div className={styles.tag}>{c.tag}</div>
                      </div>
                    </div>
                    <div className={styles.cardFoot}>
                      <span className={cx(styles.flag, soon && styles.flagSoon)}>{soon ? t('soon') : t('ready')}</span>
                      <span className={styles.grow} />
                      <span>{t('time', { time: c.time })}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className={styles.hint}>
              <span className={styles.hintIcon}>
                <Icon name="ic-spark" size={18} color={color.white} />
              </span>
              <div className={styles.grow}>
                <div className={styles.hintTitle}>{t('hintTitle')}</div>
                <div className={styles.hintBody}>{t.rich('hintBody', { b: (x) => <b>{x}</b> })}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
