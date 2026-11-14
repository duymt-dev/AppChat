// Panel "Trợ lý AI · Marketing" (392px) — prototype L3536–3566: lời chào, 4 thẻ gợi ý (bấm = mở wizard điền sẵn), ô hỏi + "Mở Trợ lý AI đầy đủ".
// Thẻ = gợi ý AI đã lưu (meta.ai: tiêu đề, loại, lý do, id gợi ý) — bấm mở wizard từ gợi ý đó. Mở từ ô AI của dòng: chiến dịch đó là ngữ cảnh. TIP-023c G2: ô hỏi gửi lượt Trợ lý THẬT (surface drawer, ngữ cảnh
// chiến dịch đang mở); "Mở Trợ lý AI đầy đủ" mở màn Trợ lý cùng phiên.
'use client';
import { useTranslations } from 'next-intl';
import { EntityDrawer, Icon, color, gradient } from '@appchat/ui';
import { ScreenAssistantThread } from '@/shared/assistant/ScreenAssistantThread';
import { useDrawerAsk } from '@/shared/assistant/useDrawerAsk';
import { useMkAiStyles } from '../styles/ai.styles';
import { useMarketingUi } from '../marketing-store';
import type { MarketingMeta } from '../types';

const KIND_TONE: Record<string, string> = { reactivation: color.zalo, upsell: color.violet, conversion: color.amberGold, aftercare: color.mkClick };

export function MarketingAiDrawer({ meta }: { meta: MarketingMeta }) {
  const t = useTranslations('marketing.aiPanel');
  const { styles } = useMkAiStyles();
  const open = useMarketingUi((s) => s.aiOpen);
  const set = useMarketingUi((s) => s.set);
  const { asst, draft, setDraft, send } = useDrawerAsk('marketing');
  const close = () => set({ aiOpen: false, focus: null });
  const run = (id: string) => set({ aiOpen: false, focus: null, wizard: true, fromSuggestion: id, prefill: null });
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
            <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder={t('ph')} aria-label={t('ph')} />
            <button type="button" className={styles.send} onClick={send} aria-label={t('send')}>
              <Icon name="ic-send" size={16} color={color.white} strokeWidth={2} />
            </button>
          </div>
          <button type="button" className={styles.full} onClick={() => (close(), asst.openFull())} data-testid="mk-ai-full">
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
          {meta.ai.length ? null : <div className={styles.cardD}>{t('none')}</div>}
          {meta.ai.map(([title, kind, desc, id], i) => (
            <button key={id ?? title} type="button" className={styles.card} onClick={() => id && run(id)} data-testid={`mk-ai-${i}`}>
              <div className={styles.cardH}>
                <span className={styles.cardIc} style={{ background: `${KIND_TONE[kind] ?? color.violet}18` }}>
                  <Icon name="ic-spark" size={15} color={KIND_TONE[kind] ?? color.violet} />
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
        <ScreenAssistantThread msgs={asst.msgs} typing={asst.typing} onDecide={(m, d) => void asst.decide(m, d)} onUi={asst.runUi} testId="mk-ai-msgs" />
      </div>
    </EntityDrawer>
  );
}
