// Form ghi chú / bình luận (TIP-026b §3.4) — contact.add_note | contact.add_comment. Nội bộ, KHÔNG gửi khách (ghi rõ ở form). Nguồn hội
// thoại (khi mở từ Hộp thư / Trợ lý) chuyển nguyên id — server kiểm thuộc đúng khách.
'use client';
import { useTranslations } from 'next-intl';
import { ModalShell, color } from '@appchat/ui';
import { useAction } from '../actions/useAction';
import { useEmailComposeStyles } from '../crm-forms/email-compose.styles';
import type { ActivityFormTarget } from './activity-store';
import { useFormFrame } from './useActivityForm';

const src = (v?: Record<string, unknown>) => ({
  ...(typeof v?.source_conversation_id === 'string' ? { source_conversation_id: v.source_conversation_id } : {}),
  ...(typeof v?.source_message_id === 'string' ? { source_message_id: v.source_message_id } : {}),
});

export function NoteForm({ target }: { target: ActivityFormTarget }) {
  const t = useTranslations('common.activities');
  const { styles, cx } = useEmailComposeStyles();
  const comment = target.kind === 'comment';
  const f = useFormFrame({ body: typeof target.values?.body === 'string' ? target.values.body : '' });
  const run = useAction(comment ? 'contact.add_comment' : 'contact.add_note');
  const save = async () => {
    if (!f.draft.body.trim()) return;
    const r = await run.run({ contact_id: target.contactId, body: f.draft.body.trim(), ...src(target.values) });
    if (r) f.done();
  };
  return (
    <ModalShell
      open
      onClose={f.close}
      width={520}
      title={t(comment ? 'form.commentTitle' : 'form.noteTitle')}
      icon="ic-edit"
      iconColor={color.brandInk}
      iconBg={color.brandBg}
      closeLabel={t('form.cancel')}
      testId="activity-note-form"
      footer={
        <>
          <button type="button" className={styles.btn} onClick={f.close}>
            {t('form.cancel')}
          </button>
          <button type="button" className={cx(styles.btn, styles.primary)} disabled={!f.draft.body.trim() || run.isPending} onClick={() => void save()} data-testid="activity-save">
            {t('form.save')}
          </button>
        </>
      }
    >
      <div className={styles.field}>
        <label className={styles.label} htmlFor="act-note-body">
          {t('form.body')}
        </label>
        <textarea id="act-note-body" className={cx(styles.input, styles.body)} maxLength={5000} value={f.draft.body} onChange={(e) => f.set({ body: e.target.value })} data-testid="activity-body" autoFocus />
      </div>
      <div className={styles.label}>{t('form.internalHint')}</div>
    </ModalShell>
  );
}
