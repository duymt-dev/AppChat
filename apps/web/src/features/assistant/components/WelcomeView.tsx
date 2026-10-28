// Màn chào Trợ lý — prototype L1193–1252: mặt bot, lời chào, composer, carousel thẻ (Chat: 5 thẻ tư duy · Cowork: 6 agent), gợi ý.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { useAssistantStyles } from '../styles/assistant.styles';
import { useAssistantUi } from '../assistant-store';
import { homeQuery } from '../api';
import { BotFaceLarge } from './BotFace';
import { Composer } from './Composer';

/** Carousel như prototype: Chat 2 trang (bước 4, vòng 5) · Cowork 3 trang (bước 2, vòng 6), mỗi trang 4 thẻ. */
const page = <T,>(items: T[], idx: number, step: number) => {
  const start = (idx * step) % items.length;
  return items.slice(start, start + 4);
};

export function WelcomeView({ name, onSend }: { name: string; onSend: (text?: string) => void }) {
  const t = useTranslations('assistant');
  const { styles, cx } = useAssistantStyles();
  const ui = useAssistantUi();
  const home = useQuery(homeQuery()).data;
  const [pg, setPg] = useState(0);
  const cowork = ui.mode === 'cowork';
  const pages = cowork ? 3 : 2;
  const accent = cowork ? color.violet : color.brand;
  const setMode = (m: 'chat' | 'cowork') => {
    ui.set({ mode: m, pop: null });
    setPg(0);
  };

  const dots = (
    <>
      <div className={styles.dots}>
        {Array.from({ length: pages }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${i + 1}`}
            className={styles.dot}
            style={pg === i ? { width: 18, background: accent } : undefined}
            onClick={() => setPg(i)}
          />
        ))}
      </div>
      <button type="button" className={styles.next} aria-label={t('next')} onClick={() => setPg((pg + 1) % pages)}>
        <svg width="12" height="12" viewBox="0 0 24 24" style={{ stroke: accent, fill: 'none', strokeWidth: 2.4 }} aria-hidden="true">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
    </>
  );

  return (
    <div className={styles.welcome} data-testid="asst-welcome">
      <BotFaceLarge className={styles.face} />
      <div className={styles.hello}>{t('hello', { name })}</div>
      <div className={styles.ask}>{t('ask')}</div>
      <div className={styles.composerWrap}>
        <Composer rows={2} full placeholder={t('placeholder')} onSend={() => onSend()} onMode={setMode} testId="asst-composer" />
        <div className={cx(styles.wide, styles.eyebrow, styles.eyebrowTop)}>
          <Icon name={cowork ? 'ic-bot' : 'ic-spark'} size={14} color={accent} strokeWidth={1.9} />
          {cowork ? t('teamTitle') : t('thinkTitle')}
          <span className={styles.grow} />
          {dots}
        </div>
        <div className={cx(styles.wide, styles.cards)} data-testid={cowork ? 'asst-agent-cards' : 'asst-think-cards'}>
          {cowork
            ? page(home?.cowork_cards ?? [], pg, 2).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={styles.card}
                  style={{ background: `linear-gradient(135deg,${a.color}12,${a.color}03)` }}
                  onClick={() => ui.set({ agent: a.name })}
                >
                  <div className={styles.cardHead}>
                    <span className={styles.cardIcon} style={{ background: a.color }}>
                      <Icon name={a.icon as IconName} size={17} color={color.white} strokeWidth={1.9} />
                    </span>
                    <span
                      className={styles.cardSt}
                      style={a.status === 'active' ? { background: color.brandBg, color: color.brandInk } : { background: color.pendingBg, color: color.amberGold }}
                    >
                      {t(`agentStatus.${a.status}`)}
                    </span>
                  </div>
                  <div className={styles.cardTitle}>{a.name}</div>
                  <div className={styles.cardDesc}>{a.desc}</div>
                  <div className={styles.cardTag} style={{ background: `${a.color}16`, color: a.color }}>
                    {t(`tier.${a.model_tier}`)}
                  </div>
                </button>
              ))
            : page(home?.think_cards ?? [], pg, 4).map((c) => (
                <button
                  key={c.label}
                  type="button"
                  className={styles.card}
                  style={{ background: `linear-gradient(135deg,${c.color}12,${c.color}03)` }}
                  onClick={() => ui.set({ draft: c.command })}
                >
                  <div className={styles.cardHead}>
                    <span className={styles.cardIcon} style={{ background: c.color }}>
                      <Icon name={c.icon as IconName} size={17} color={color.white} strokeWidth={1.9} />
                    </span>
                  </div>
                  <div className={styles.cardTitle}>{c.label}</div>
                  <div className={styles.cardDesc}>{c.desc}</div>
                  <div className={styles.cardTag} style={{ background: `${c.color}16`, color: c.color }}>
                    {c.tag}
                  </div>
                </button>
              ))}
        </div>
      </div>
      <div className={styles.suggest}>
        <div className={cx(styles.wide, styles.eyebrow)}>
          <Icon name="ic-spark" size={14} color={color.brand} strokeWidth={1.9} />
          {t('suggestTitle')}
        </div>
        <div className={cx(styles.wide, styles.chips)}>
          {(home?.prompts ?? []).map((p) => (
            <button key={p} type="button" className={styles.prompt} onClick={() => onSend(p)}>
              <Icon name="ic-spark" size={14} color={color.brand} strokeWidth={1.9} />
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
