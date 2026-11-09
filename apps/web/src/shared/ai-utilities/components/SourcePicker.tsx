// Chọn nguồn tường minh cho kỹ năng tiện ích (TIP-019c §4.2): chữ dán (đánh dấu chưa xác minh) · tin chọn của hội thoại đang mở
// (tối đa 30, lấy từ reader Hộp thư sẵn có) · khách đang mở. Không chọn gì → không gửi; không bao giờ suy "toàn bộ CRM".
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { messageChoicesQuery } from '../api';
import { useUtilityStyles } from '../styles';
import type { UtilityContext, UtilitySourceChoice } from '../types';

type Kind = UtilitySourceChoice['kind'];

export interface SourceDraft {
  kind: Kind;
  text: string;
  messageIds: string[];
}

export const sourceOf = (d: SourceDraft, ctx: UtilityContext): UtilitySourceChoice | null => {
  if (d.kind === 'text') return d.text.trim() ? { kind: 'text', text: d.text } : null;
  if (d.kind === 'conversation') return ctx.conversationId && d.messageIds.length ? { kind: 'conversation', conversation_id: ctx.conversationId, message_ids: d.messageIds } : null;
  return ctx.contactId ? { kind: 'contact', contact_id: ctx.contactId } : null;
};

export function SourcePicker({ ctx, draft, onChange, kinds }: { ctx: UtilityContext; draft: SourceDraft; onChange: (d: SourceDraft) => void; kinds: Kind[] }) {
  const t = useTranslations('assistant.utility');
  const { styles, cx } = useUtilityStyles();
  const avail = kinds.filter((k) => k === 'text' || (k === 'conversation' ? !!ctx.conversationId : !!ctx.contactId));
  const msgs = useQuery({ ...messageChoicesQuery(ctx.conversationId ?? ''), enabled: draft.kind === 'conversation' && !!ctx.conversationId });
  const toggle = (id: string) => onChange({ ...draft, messageIds: draft.messageIds.includes(id) ? draft.messageIds.filter((x) => x !== id) : [...draft.messageIds, id].slice(-30) });

  return (
    <div>
      {avail.length > 1 ? (
        <>
          <span className={styles.label}>{t('source')}</span>
          <div className={styles.seg} role="radiogroup">
            {avail.map((k) => (
              <button key={k} type="button" role="radio" aria-checked={draft.kind === k} className={cx(styles.chip, draft.kind === k && styles.chipOn)} data-testid={`utility-src-${k}`} onClick={() => onChange({ ...draft, kind: k })}>
                {t(`src.${k}`)}
              </button>
            ))}
          </div>
        </>
      ) : null}
      {draft.kind === 'text' ? (
        <>
          <textarea className={styles.input} rows={4} value={draft.text} maxLength={8000} placeholder={t('textPlaceholder')} aria-label={t('src.text')} data-testid="utility-text" onChange={(e) => onChange({ ...draft, text: e.target.value })} />
          <div className={styles.hint}>{t('unverified')}</div>
        </>
      ) : null}
      {draft.kind === 'conversation' ? (
        <div data-testid="utility-messages">
          {msgs.isLoading ? <div className={styles.hint}>{t('loading')}</div> : null}
          {msgs.isError ? <div className={styles.error}>{t('messagesError')}</div> : null}
          {msgs.data && !msgs.data.length ? <div className={styles.hint}>{t('noMessages')}</div> : null}
          {(msgs.data ?? []).map((m) => (
            <label key={m.id} className={styles.msg}>
              <input type="checkbox" checked={draft.messageIds.includes(m.id)} onChange={() => toggle(m.id)} data-testid={`utility-msg-${m.id}`} />
              <span className={styles.grow}>{m.text}</span>
            </label>
          ))}
          <div className={styles.hint}>{t('pickMessages', { n: draft.messageIds.length })}</div>
        </div>
      ) : null}
      {draft.kind === 'contact' ? <div className={styles.hint}>{t('contactNarrow')}</div> : null}
    </div>
  );
}
