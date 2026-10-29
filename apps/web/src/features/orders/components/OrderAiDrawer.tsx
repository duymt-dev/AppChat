// Panel "Trợ lý AI · Đơn hàng" — prototype L5556–5571 (odAiRun L8081). Mock: kết quả mẫu từ /orders/meta (không gọi LLM).
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { EntityDrawer, Icon, color, gradient } from '@appchat/ui';
import { useOrderAiStyles } from '../styles/ai.styles';
import { useOrdersUi } from '../orders-store';
import type { OrdersMeta } from '../types';

const RUNS = [
  ['risk', 'ic-shield'],
  ['upsell', 'ic-spark'],
  ['collect', 'ic-chart'],
  ['analyze', 'ic-doc'],
] as const;

export function OrderAiDrawer({ meta }: { meta: OrdersMeta }) {
  const t = useTranslations('orders.aiPanel');
  const { styles } = useOrderAiStyles();
  const ui = useOrdersUi();
  const [result, setResult] = useState('');
  const [draft, setDraft] = useState('');
  const run = (k: string) => setResult(meta.ai_runs[k] ?? '');
  const send = () => {
    const text = draft.trim().toLowerCase();
    if (!text) return;
    setDraft('');
    setResult(
      /thanh toán|cọc|link|pay/.test(text)
        ? t('ackPay')
        : /huỷ|hủy|win|cancel/.test(text)
          ? t('ackCancel')
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
      iconBg={gradient.brandSoft}
      tinted
      closeLabel={t('close')}
      testId="od-ai"
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
      <div className={styles.body}>
        <div className={styles.group}>{t('group')}</div>
        <div className={styles.list}>
          {RUNS.map(([k, ic]) => (
            <button
              key={k}
              type="button"
              className={styles.run}
              onClick={() => run(k)}
              data-testid={`od-ai-${k}`}
            >
              <span className={styles.runIc}>
                <Icon name={ic} size={15} color={color.brandInk} />
              </span>
              {t(`runs.${k}`)}
            </button>
          ))}
        </div>
        {result ? (
          <div className={styles.result} data-testid="od-ai-result">
            {result}
          </div>
        ) : null}
      </div>
    </EntityDrawer>
  );
}
