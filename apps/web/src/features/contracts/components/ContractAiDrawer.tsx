// Panel "Trợ lý AI · Hợp đồng" — prototype L5413–5428. Mock: kết quả mẫu từ /contracts/meta (không gọi LLM).
// "Soạn dự thảo hợp đồng" mở form tạo hợp đồng (AI chỉ soạn nháp — COMMERCE §9 / §12).
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { EntityDrawer, Icon, color, gradient } from '@appchat/ui';
import { useContractAiStyles } from '../styles/ai.styles';
import { useContractsUi } from '../contracts-store';
import type { ContractsMeta } from '../types';

const RUNS = [
  ['risk', 'ic-shield'],
  ['draft', 'ic-doc'],
  ['renew', 'ic-refresh'],
  ['analyze', 'ic-chart'],
] as const;

export function ContractAiDrawer({ meta }: { meta: ContractsMeta }) {
  const t = useTranslations('contracts.aiPanel');
  const { styles } = useContractAiStyles();
  const ui = useContractsUi();
  const [result, setResult] = useState('');
  const [draft, setDraft] = useState('');
  const run = (k: string) => {
    if (k === 'draft') ui.set({ form: 'create', prefill: null });
    setResult(meta.ai_runs[k] ?? '');
  };
  const send = () => {
    const text = draft.trim().toLowerCase();
    if (!text) return;
    setDraft('');
    setResult(/hạn|gia hạn|renew|expir/.test(text) ? t('ackRenew') : t('ack'));
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
      testId="ct-ai"
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
              data-testid={`ct-ai-${k}`}
            >
              <span className={styles.runIc}>
                <Icon name={ic} size={15} color={color.brandInk} />
              </span>
              {t(`runs.${k}`)}
            </button>
          ))}
        </div>
        {result ? (
          <div className={styles.result} data-testid="ct-ai-result">
            {result}
          </div>
        ) : null}
      </div>
    </EntityDrawer>
  );
}
