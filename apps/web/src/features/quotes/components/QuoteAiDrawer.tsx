// Panel "Trợ lý AI · Báo giá" — prototype L5166–5186. "Soạn nội dung báo giá" của prototype → "Soạn báo giá từ nội dung" (D30, action
// quote.draft_from_content). TIP-023c G2: nút nghiệp vụ = prompt soạn sẵn gửi Trợ lý THẬT (surface drawer, ngữ cảnh báo giá đang mở /
// dòng chọn); khung tóm tắt là số liệu đếm theo luật của `/quotes/meta.ai_runs` (thông tin, không phải câu trả lời AI). Ô hỏi gửi lượt thật.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { EntityDrawer, Icon, color, gradient } from '@appchat/ui';
import { ScreenAssistantThread } from '@/shared/assistant/ScreenAssistantThread';
import { useDrawerAsk } from '@/shared/assistant/useDrawerAsk';
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
  const { asst, draft, setDraft, send, ask } = useDrawerAsk('quotes');
  const run = (k: string) => {
    if (k === 'draft') return ui.set({ aiOpen: false, draftOpen: true });
    setResult(meta.ai_runs[k] ?? '');
    ask(t(`prompts.${k}` as never));
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
      // `.p360` của prototype (L5538) bị ép 340px ở ≤ 1440 (L71).
      width={340}
      footer={
        <div className={styles.foot}>
          <div className={styles.box}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={t('ph')}
              aria-label={t('ph')}
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
            disabled={asst.typing}
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
      <div className={styles.thread}>
        <ScreenAssistantThread msgs={asst.msgs} typing={asst.typing} onDecide={(m, d) => void asst.decide(m, d)} onUi={asst.runUi} onOpenFull={asst.openFull} testId="q-ai-msgs" />
      </div>
    </EntityDrawer>
  );
}
