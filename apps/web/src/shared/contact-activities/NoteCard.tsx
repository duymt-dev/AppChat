// Thẻ "Ghi chú" + "Comment" (TIP-026b §3.4) — prototype L2422–2445: ghi chú gần nhất CHỈ kind note; bình luận CHỈ kind comment, ô
// "Viết bình luận…" gửi contact.add_comment (nội bộ — không gửi khách). Tác giả agent kênh ghi rõ "AI Agent".
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import type { ActivitySummaryDto } from '@appchat/shared';
import { useFmt } from '../i18n/useFmt';
import { useActivityUi } from './activity-store';
import { useActivityStyles } from './activity.styles';
import { useActivityActions } from './useActivityActions';

export function NoteCard({ contactId, a }: { contactId: string; a: ActivitySummaryDto }) {
  const t = useTranslations('common.activities');
  const fmt = useFmt();
  const { styles } = useActivityStyles();
  const open = useActivityUi((s) => s.openForm);
  const list = useActivityUi((s) => s.openList);
  const n = a.notes.latest;
  return (
    <div className={styles.card} data-testid="p360-note">
      <div className={styles.head}>
        <span className={styles.eyebrow}>{t('notes')}</span>
        {a.can_edit ? (
          <button type="button" className={styles.link} onClick={() => open({ kind: 'note', contactId })} data-testid="note-add">
            {t('addNote')}
          </button>
        ) : null}
      </div>
      {n ? (
        <div className={styles.noteBox}>
          <div className={styles.noteLabel}>{t('latestNote')}</div>
          <div className={styles.body}>{n.body}</div>
          <div className={styles.meta}>
            {n.author.name} · {fmt.date(n.created_at)} {fmt.time(n.created_at)}
          </div>
        </div>
      ) : (
        <div className={styles.empty}>{t('notesEmpty')}</div>
      )}
      {a.notes.count > 1 ? (
        <button type="button" className={styles.more} onClick={() => list(contactId, 'notes')}>
          {t('allNotes', { n: a.notes.count })}
        </button>
      ) : null}
    </div>
  );
}

export function CommentCard({ contactId, a }: { contactId: string; a: ActivitySummaryDto }) {
  const t = useTranslations('common.activities');
  const fmt = useFmt();
  const { styles, cx } = useActivityStyles();
  const list = useActivityUi((s) => s.openList);
  const act = useActivityActions(contactId);
  const [draft, setDraft] = useState('');
  const send = async () => {
    if (!draft.trim()) return;
    if (await act.addComment(draft)) setDraft('');
  };
  return (
    <div className={styles.card} data-testid="p360-comments">
      <div className={styles.head}>
        <span className={styles.eyebrow}>{t('comments')}</span>
      </div>
      {a.can_edit ? (
        <div className={styles.composer}>
          <input
            className={styles.input}
            value={draft}
            maxLength={5000}
            placeholder={t('commentPlaceholder')}
            aria-label={t('commentPlaceholder')}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && void send()}
            data-testid="comment-input"
          />
          <button type="button" className={styles.send} disabled={!draft.trim() || act.commenting} onClick={() => void send()} aria-label={t('send')} data-testid="comment-send">
            <Icon name="ic-send" size={15} color={color.brandInk} />
          </button>
        </div>
      ) : null}
      {a.comments.items.length ? (
        a.comments.items.map((m) => (
          <div key={m.id} className={styles.comment}>
            <div className={cx(styles.avatar, m.author.type !== 'user' && styles.agent)}>{(m.author.name[0] ?? '?').toUpperCase()}</div>
            <div>
              <div className={styles.author}>{m.author.name}</div>
              <div className={styles.body}>{m.body}</div>
              <div className={styles.meta}>
                {fmt.date(m.created_at)} {fmt.time(m.created_at)}
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className={styles.empty}>{t('commentsEmpty')}</div>
      )}
      {a.comments.next_cursor ? (
        <button type="button" className={styles.more} onClick={() => list(contactId, 'comments')}>
          {t('allComments', { n: a.comments.count })}
        </button>
      ) : null}
    </div>
  );
}
