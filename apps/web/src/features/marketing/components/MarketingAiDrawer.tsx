// Panel "Trợ lý AI · Marketing" (392px) — prototype L3536–3566: lời chào, 4 thẻ gợi ý (bấm = mở wizard điền sẵn), ô hỏi + "Mở Trợ lý AI đầy đủ".
// Mock: không gọi LLM. Thẻ gợi ý gắn với đề xuất AI (/campaign-suggestions) theo thứ tự.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { EntityDrawer, Icon, color, gradient } from '@appchat/ui';
import { useShellStore } from '@/shared/shell/shell-store';
import { useMkAiStyles } from '../styles/ai.styles';
import { useMarketingUi } from '../marketing-store';
import { suggestionsQuery } from '../api';
import type { MarketingMeta } from '../types';

export function MarketingAiDrawer({ meta }: { meta: MarketingMeta }) {
  const t = useTranslations('marketing.aiPanel');
  const { styles } = useMkAiStyles();
  const open = useMarketingUi((s) => s.aiOpen);
  const set = useMarketingUi((s) => s.set);
  const setDock = useShellStore((s) => s.setDock);
  const sugg = useQuery({ ...suggestionsQuery(), enabled: open }).data?.data ?? [];
  const [draft, setDraft] = useState('');
  const [ack, setAck] = useState('');
  const close = () => set({ aiOpen: false });
  const run = (i: number) => {
    const s = sugg[i];
    set({ aiOpen: false, wizard: true, fromSuggestion: s?.id ?? null, prefill: s ? null : { name: meta.ai[i]?.[0] } });
  };
  const send = () => {
    if (!draft.trim()) return;
    setDraft('');
    setAck(t('ack'));
  };
  return (
    <EntityDrawer
      open={open}
      onClose={close}
      title={t('title')}
      subtitle={t('sub')}
      icon="ic-spark"
      iconBg={gradient.ai}
      tinted
      closeLabel={t('close')}
      testId="mk-ai"
      footer={
        <div className={styles.foot}>
          <div className={styles.box}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder={t('ph')} />
            <button type="button" className={styles.send} onClick={send} aria-label={t('send')}>
              <Icon name="ic-send" size={16} color={color.white} strokeWidth={2} />
            </button>
          </div>
          <button type="button" className={styles.full} onClick={() => (close(), setDock(true))}>
            <Icon name="ic-spark" size={14} color={color.violetInk} />
            {t('full')}
          </button>
        </div>
      }
    >
      <div className={styles.body}>
        <div className={styles.hello}>
          <span className={styles.bot}>
            <Icon name="ic-spark" size={16} color={color.sparkMint} />
          </span>
          <div className={styles.bubble}>{t('hello')}</div>
        </div>
        <div className={styles.list}>
          {meta.ai.map(([title, tone, desc], i) => (
            <button key={title} type="button" className={styles.card} onClick={() => run(i)} data-testid={`mk-ai-${i}`}>
              <div className={styles.cardH}>
                <span className={styles.cardIc} style={{ background: `${tone}18` }}>
                  <Icon name="ic-spark" size={15} color={tone} />
                </span>
                {title}
              </div>
              <div className={styles.cardD}>{desc}</div>
              <div className={styles.go}>
                <Icon name="ic-arrow" size={13} color={color.brandInk} strokeWidth={2} />
                {t('go')}
              </div>
            </button>
          ))}
        </div>
        {ack ? <div className={styles.result}>{ack}</div> : null}
      </div>
    </EntityDrawer>
  );
}
