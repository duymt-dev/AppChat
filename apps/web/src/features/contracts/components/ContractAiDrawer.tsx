// Panel "Trợ lý AI · Hợp đồng" — prototype L5413–5428. TIP-023c G2: nút nghiệp vụ = prompt soạn sẵn gửi
// Trợ lý THẬT (surface drawer, ngữ cảnh bản ghi đang mở / dòng chọn); khung tóm tắt = số liệu đếm theo luật của `/contracts/meta.ai_runs`
// (thông tin, không phải câu trả lời AI). Ô hỏi gửi lượt thật.
// "Soạn dự thảo hợp đồng" mở form tạo hợp đồng (AI chỉ soạn nháp — COMMERCE §9 / §12).
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { EntityDrawer, Icon, color, gradient } from '@appchat/ui';
import { ScreenAssistantThread } from '@/shared/assistant/ScreenAssistantThread';
import { useDrawerAsk } from '@/shared/assistant/useDrawerAsk';
import { RecordDrawerSection, useRecordBound } from '@/shared/assistant/record-intent/RecordDrawerSection';
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
  const { asst, draft, setDraft, send, ask } = useDrawerAsk('contracts');
  const bound = useRecordBound('contracts');
  const run = (k: string) => {
    // "Soạn dự thảo" mở form tạo hợp đồng (AI chỉ soạn nháp — COMMERCE §9 / §12), không giả kết quả.
    if (k === 'draft') return ui.set({ aiOpen: false, form: 'create', prefill: null });
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
      iconBg={gradient.brandSoft}
      tinted
      closeLabel={t('close')}
      testId="ct-ai"
      footer={
        bound ? undefined : (
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
        )
      }
    >
      <RecordDrawerSection module="contracts" testId="ct-rai" />
      {bound ? null : (
        <>
          <div className={styles.body}>
            <div className={styles.group}>{t('group')}</div>
            <div className={styles.list}>
              {RUNS.map(([k, ic]) => (
                <button
                  key={k}
                  type="button"
                  className={styles.run}
                  onClick={() => run(k)}
                  disabled={asst.typing}
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
            <ScreenAssistantThread
              msgs={asst.msgs}
              typing={asst.typing}
              onDecide={(m, d) => void asst.decide(m, d)}
              onUi={asst.runUi}
              onOpenFull={asst.openFull}
              testId="ct-ai-msgs"
            />
          </div>
        </>
      )}
    </EntityDrawer>
  );
}
