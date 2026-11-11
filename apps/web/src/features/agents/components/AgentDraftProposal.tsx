// Thẻ đề xuất bản soạn agent (TIP-021b §3.3, D29): cấu hình + nói thật nguồn (model hay mẫu tất định có lý do) + cảnh báo mã + tool kèm
// mức rủi ro. Hai đường xác nhận giữ nguyên: "Tạo & xuất bản" (agent.create_and_publish — thẻ xác nhận chuẩn) | "Mở trong builder".
'use client';
import { useTranslations } from 'next-intl';
import { getAction } from '@appchat/actions';
import { Icon, color } from '@appchat/ui';
import { useSideStyles } from '../styles/side.styles';
import type { AgentDraftResult } from '../types';

interface Props {
  value: AgentDraftResult;
  publishing: boolean;
  onPublish: () => void;
  onBuilder: () => void;
  onRegenerate: () => void;
}

export function AgentDraftProposal({ value, publishing, onPublish, onBuilder, onRegenerate }: Props) {
  const t = useTranslations('agents');
  const tAll = useTranslations();
  const { styles } = useSideStyles();
  const { draft, generation_info: info } = value;
  const ch = (k: string) => t(`b.channel.${k}` as never);
  const tool = (id: string) => {
    const def = getAction(id);
    return def ? `${tAll(def.title as never)} · ${tAll(`assistant.ap.risk.${def.risk}` as never)}` : id;
  };
  const model = info.mode === 'model';

  return (
    <div className={styles.draft} data-testid="ag-ai-draft">
      <div className={styles.draftHead}>
        <Icon name="ic-spark" size={14} color={color.violetInk} strokeWidth={1.9} />
        {t('ai.draft')}
      </div>
      <div className={styles.draftLead} data-testid="ag-ai-mode" data-mode={info.mode}>
        {model ? t('ai.draftLead') : t(`ai.fallback.${info.fallback_reason ?? 'no_model_route'}`)}
      </div>
      {info.warnings.length ? (
        <div data-testid="ag-ai-warnings">
          {info.warnings.map((w) => (
            <div key={w} className={styles.draftLead}>
              {t(`ai.warn.${w}`)}
            </div>
          ))}
        </div>
      ) : null}
      <div className={styles.kv}>
        <span className={styles.k}>{t('ai.fName')}</span>
        <span className={styles.v}>
          {draft.emoji} {draft.name}
        </span>
        <span className={styles.k}>{t('ai.fRole')}</span>
        <span className={styles.v}>{t(`ai.role.${draft.role ?? 'custom'}`)}</span>
        <span className={styles.k}>{t('ai.fTier')}</span>
        <span className={styles.v}>{t(`tier.${draft.model_tier}`)}</span>
        <span className={styles.k}>{t('ai.fChannels')}</span>
        <span className={styles.v}>{draft.channels.map(ch).join(', ')}</span>
        <span className={styles.k}>{t('ai.fTools')}</span>
        <span className={styles.v} data-testid="ag-ai-tools">
          {draft.tools.length ? draft.tools.map(tool).join(', ') : t('ai.noTools')}
        </span>
        <span className={styles.k}>{t('ai.fThreshold')}</span>
        <span className={styles.v}>{t('ai.pct', { n: draft.threshold })}</span>
      </div>
      <div className={styles.draftActs}>
        <button type="button" className={styles.primary} onClick={onPublish} disabled={publishing} data-testid="ag-ai-publish">
          <Icon name="ic-check" size={14} color={color.white} strokeWidth={2} />
          {t('ai.publish')}
        </button>
        <button type="button" className={styles.ghost} onClick={onBuilder} data-testid="ag-ai-builder">
          {t('ai.openBuilder')}
        </button>
        <button type="button" className={styles.ghost} onClick={onRegenerate} data-testid="ag-ai-regenerate">
          {t('ai.regenerate')}
        </button>
      </div>
    </div>
  );
}
