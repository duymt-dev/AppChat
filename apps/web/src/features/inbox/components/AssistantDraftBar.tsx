// Hàng "AI soạn / viết lại" của ô soạn Hộp thư (TIP-023c REQ-C05c — prototype không vẽ, PD-010): nút Soạn (nháp trống) / Viết lại (đã
// có nháp) → đang soạn (Huỷ) → thẻ đề xuất: Thay nháp / Chèn thêm / Bỏ; nháp đổi trong lúc chờ → cảnh báo xung đột; lỗi → Thử lại.
// Không có nút gửi — gửi vẫn là nút Gửi của ô soạn.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useComposerStyles } from '../styles/composer.styles';
import type { useAssistantDraft } from '../hooks/useAssistantDraft';
import { AiDraftCard } from './AiDraftCard';

export function AssistantDraftBar({ d, hasDraft }: { d: ReturnType<typeof useAssistantDraft>; hasDraft: boolean }) {
  const t = useTranslations('inbox.composer.aiDraft');
  const { styles } = useComposerStyles();
  if (d.pending)
    return (
      <div className={styles.replyBar} data-testid="ai-draft-pending">
        <span className={styles.grow}>{t('pending')}</span>
        <button type="button" className={styles.ghost} onClick={d.cancel}>
          {t('cancel')}
        </button>
      </div>
    );
  if (d.error)
    return (
      <div className={styles.replyBar} data-testid="ai-draft-error">
        <span className={styles.grow}>{t('error')}</span>
        <button type="button" className={styles.ghost} onClick={d.retry}>
          {t('retry')}
        </button>
        <button type="button" className={styles.ghost} onClick={d.dismiss}>
          {t('dismiss')}
        </button>
      </div>
    );
  if (d.proposal)
    return (
      <AiDraftCard
        testId="ai-draft-proposal"
        title={t(d.proposal.purpose === 'inbox_rewrite' ? 'rewritten' : 'composed')}
        badge={d.proposal.conflict ? t('conflictBadge') : t('badge')}
        body={
          <>
            {d.proposal.conflict ? <div data-testid="ai-draft-conflict">{t('conflict')}</div> : null}
            <div data-testid="ai-draft-text">{d.proposal.text}</div>
          </>
        }
        actions={
          <>
            <button type="button" className={styles.primary} onClick={d.replace} data-testid="ai-draft-replace">
              {t('replace')}
            </button>
            <button type="button" className={styles.ghost} onClick={d.insert} data-testid="ai-draft-insert">
              {t('insert')}
            </button>
            <button type="button" className={styles.ghost} onClick={d.dismiss}>
              {t('dismiss')}
            </button>
          </>
        }
      />
    );
  return (
    <button type="button" className={styles.tool} onClick={hasDraft ? d.rewrite : d.compose} data-testid="ai-draft-ask">
      <Icon name="ic-spark" size={14} color={color.brandInk} />
      {t(hasDraft ? 'rewrite' : 'compose')}
    </button>
  );
}
