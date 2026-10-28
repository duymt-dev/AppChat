// Panel "Trợ lý AI · Báo giá" — prototype L5166–5186. Mock: kết quả mẫu từ /quotes/meta (không gọi LLM).
// "Soạn nội dung báo giá" của prototype → "Soạn báo giá từ nội dung" (D30, action quote.draft_from_content).
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { EntityDrawer, Icon, color, gradient } from '@appchat/ui';
import { useQuoteAiStyles } from '../styles/ai.styles';
import { useQuotesUi } from '../quotes-store';
import type { QuotesMeta } from '../types';

const RUNS: [key: string, tone: string][] = [
  ['sugg', color.blue],
  ['draft', color.okGreen],
  ['followup', color.amberDeep],
  ['analyze', color.violet],
];

export function QuoteAiDrawer({ meta }: { meta: QuotesMeta }) {
  const t = useTranslations('quotes.aiPanel');
  const { styles } = useQuoteAiStyles();
  const ui = useQuotesUi();
  const [result, setResult] = useState('');
  const [draft, setDraft] = useState('');
  const run = (k: string) => {
    if (k === 'draft') return ui.set({ aiOpen: false, draftOpen: true });
    setResult(meta.ai_runs[k] ?? '');
  };
  const send = () => {
    const text = draft.trim().toLowerCase();
    if (!text) return;
    setDraft('');
    setResult(
      /giá|combo|bao nhiêu|price/.test(text)
        ? t('ackPrice')
        : /nhắc|follow|chờ/.test(text)
          ? t('ackFollow')
          : t('ack'),
    );
  };
  return (
    <EntityDrawer
      open={ui.aiOpen}
      onClose={() => ui.set({ aiOpen: false })}
      title={t('title')}
      subtitle={t('sub')}
      icon="ic-spark"
      iconBg={gradient.quoteAiIcon}
      tinted
      closeLabel={t('close')}
      testId="q-ai"
      footer={
        <div className={styles.foot}>
          <div className={styles.box}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={t('ph')}
            />
            <button type="button" className={styles.send} onClick={send} aria-label={t('send')}>
              <Icon name="ic-send" size={14} color={color.white} />
            </button>
          </div>
        </div>
      }
    >
      <div className={styles.intro}>
        <span className={styles.bot}>
          <Icon name="ic-spark" size={14} color={color.white} />
        </span>
        <div className={styles.bubble}>{t.rich('intro', { b: (c) => <b>{c}</b> })}</div>
      </div>
      <div className={styles.group}>{t('group')}</div>
      <div className={styles.list}>
        {RUNS.map(([k, tone]) => (
          <button
            key={k}
            type="button"
            className={styles.run}
            onClick={() => run(k)}
            data-testid={`q-ai-${k}`}
          >
            <span className={styles.runIc} style={{ background: `${tone}18` }}>
              <Icon name="ic-spark" size={15} color={tone} />
            </span>
            <div>
              <div className={styles.runL}>{t(`runs.${k}` as never)}</div>
              <div className={styles.runD}>{t(`runs.${k}D` as never)}</div>
            </div>
          </button>
        ))}
      </div>
      {result ? (
        <div className={styles.result} data-testid="q-ai-result">
          <div className={styles.resultH}>{t('result')}</div>
          {result}
        </div>
      ) : null}
    </EntityDrawer>
  );
}
