// Form một kỹ năng tiện ích (TIP-019c §4.2): nguồn tường minh + tuỳ chọn theo kỹ năng; bấm "Chạy" → useUtility (useAction, khoá mỗi lần
// bấm); Enter trong form không lan sang ô soạn Trợ lý; nút khoá khi đang chạy; nháp giữ khi huỷ / lỗi.
'use client';
import { useState, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { getAction } from '@appchat/actions';
import { useUtility } from '../hooks/useUtility';
import { useUtilityStyles } from '../styles';
import type { ExtractField, UtilityActionId, UtilityContext } from '../types';
import { SourcePicker, sourceOf, type SourceDraft } from './SourcePicker';
import { UtilityResult } from './UtilityResult';
import { ExtractFields, defaultFields, fieldsValid } from './ExtractFields';

const contextKeyOf = (c: UtilityContext) => `${c.conversationId ?? ''}|${c.contactId ?? ''}`;

function inputOf(actionId: UtilityActionId, ctx: UtilityContext, draft: SourceDraft, bullets: number, fields: ExtractField[]): Record<string, unknown> | null {
  if (actionId === 'ai.score_lead') {
    if (!ctx.contactId) return null;
    const msgs = ctx.conversationId && draft.messageIds.length ? { conversation_id: ctx.conversationId, message_ids: draft.messageIds } : {};
    return { contact_id: ctx.contactId, ...msgs };
  }
  const source = sourceOf(draft, ctx);
  if (!source) return null;
  if (actionId === 'ai.summarize') return { source, max_bullets: bullets };
  if (actionId === 'ai.extract_info') return fieldsValid(fields) ? { source, fields } : null;
  return { source };
}

export function UtilityForm({ actionId, ctx, onClose }: { actionId: UtilityActionId; ctx: UtilityContext; onClose: () => void }) {
  const t = useTranslations('assistant.utility');
  const tAll = useTranslations();
  const { styles } = useUtilityStyles();
  const u = useUtility(actionId, contextKeyOf(ctx));
  const lead = actionId === 'ai.score_lead';
  const [draft, setDraft] = useState<SourceDraft>({ kind: ctx.conversationId ? 'conversation' : 'text', text: '', messageIds: [] });
  const [bullets, setBullets] = useState(5);
  const [fields, setFields] = useState<ExtractField[]>(() => defaultFields((k) => t(k as never)));

  const input = inputOf(actionId, ctx, draft, bullets, fields);
  const ready = !!input && !u.busy;
  const submit = () => {
    if (input && !u.busy) void u.run(input);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') return onClose();
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.stopPropagation();
    if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
    e.preventDefault();
    submit();
  };

  return (
    <div className={styles.panel} data-testid={`utility-form-${actionId}`} onKeyDown={onKey}>
      <div className={styles.head}>
        <span className={styles.grow}>{tAll((getAction(actionId)?.title ?? actionId) as never)}</span>
        <span className={styles.hint}>{t('usesCredit')}</span>
      </div>
      {lead && !ctx.contactId ? (
        <div className={styles.hint} data-testid="utility-need-contact">
          {t('needContact')}
        </div>
      ) : null}
      {lead && ctx.contactId ? <div className={styles.hint}>{t('leadSource')}</div> : null}
      {lead && ctx.contactId && ctx.conversationId ? <SourcePicker ctx={ctx} draft={{ ...draft, kind: 'conversation' }} onChange={setDraft} kinds={['conversation']} /> : null}
      {!lead ? <SourcePicker ctx={ctx} draft={draft} onChange={setDraft} kinds={['conversation', 'contact', 'text']} /> : null}
      {actionId === 'ai.summarize' ? (
        <>
          <span className={styles.label}>{t('bullets')}</span>
          <input type="number" min={1} max={10} className={styles.input} value={bullets} onChange={(e) => setBullets(Math.min(10, Math.max(1, Number(e.target.value) || 1)))} data-testid="utility-bullets" aria-label={t('bullets')} />
        </>
      ) : null}
      {actionId === 'ai.extract_info' ? <ExtractFields fields={fields} onChange={setFields} /> : null}
      <div className={styles.row}>
        <button type="button" className={styles.btn} disabled={!ready} onClick={submit} data-testid="utility-run">
          {u.busy ? t('running') : t('run')}
        </button>
        <button type="button" className={styles.ghost} onClick={onClose} data-testid="utility-close">
          {t('close')}
        </button>
        {!input && !u.busy ? <span className={styles.hint}>{t('pickSource')}</span> : null}
      </div>
      <UtilityResult phase={u.phase} envelope={u.envelope} />
    </div>
  );
}
