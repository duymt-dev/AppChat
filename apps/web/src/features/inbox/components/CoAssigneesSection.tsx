// Đồng phụ trách (conversation_assignee) trong submenu "Phân công" của menu ⋯ — khác người/agent phụ trách CHÍNH (AssignPicker).
// Hiện danh sách hiện có (chip + nút gỡ gọi conversation.remove_assignee) + nút mở picker thêm mới (gọi conversation.add_assignee),
// ẩn người/agent đã là phụ trách chính hoặc đã có trong danh sách (giống `taken` của CollaboratorsModal, D32).
'use client';
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useRowStyles } from '../styles/row.styles';
import { assigneesQuery } from '../assign-api';
import type { Conversation } from '../types';

export function CoAssigneesSection({ conv }: { conv: Conversation }) {
  const t = useTranslations('inbox.list');
  const { styles, cx } = useRowStyles();
  const allowed = useCan('inbox.assign');
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState('');
  const list = useInfiniteQuery(assigneesQuery(conv.id, q.trim(), allowed && picking));
  const rows = list.data?.pages.flatMap((p) => p.data) ?? [];
  const add = useAction('conversation.add_assignee');
  const remove = useAction('conversation.remove_assignee');
  const co = conv.co_assignees ?? [];

  if (!allowed) return null;
  const pick = (kind: 'user' | 'agent', id: string) => {
    setPicking(false);
    setQ('');
    void add.run({ conversation_id: conv.id, kind, assignee_id: id });
  };

  return (
    <>
      <div className={styles.tagHint}>{t('coAssigneesTitle')}</div>
      {co.length ? (
        <div className={styles.tagWrap}>
          {co.map((a) => (
            <span key={`${a.kind}:${a.id}`} className={cx(styles.tagChip, styles.tagChipOn)} onClick={() => void remove.run({ conversation_id: conv.id, kind: a.kind, assignee_id: a.id })} title={t('coAssigneesRemove', { name: a.name })}>
              {a.name} ✕
            </span>
          ))}
        </div>
      ) : (
        <div className={styles.tagHint}>{t('coAssigneesNone')}</div>
      )}
      {picking ? (
        <>
          <div className={styles.tagNewRow}>
            <input className={styles.tagInput} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('assignSearch')} aria-label={t('assignSearch')} data-testid="co-assignee-search" />
          </div>
          <div className={styles.subList} data-testid="co-assignee-list">
            {list.isLoading ? <div className={styles.tagHint}>{t('assignLoading')}</div> : null}
            {!list.isLoading && !rows.filter((a) => !a.current && !a.co_assignee).length ? <div className={styles.tagHint}>{t('assignEmpty')}</div> : null}
            {rows.filter((a) => !a.current && !a.co_assignee).map((a) => (
              <button key={`${a.kind}:${a.id}`} type="button" className={styles.item} onClick={() => pick(a.kind, a.id)} data-testid={`co-assignee-pick-${a.kind}-${a.id}`}>
                <span className={styles.dot} />
                <span className={styles.grow}>{a.name}</span>
              </button>
            ))}
            {list.hasNextPage ? (
              <button type="button" className={styles.item} onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage}>
                <span className={styles.grow}>{t('assignMore')}</span>
              </button>
            ) : null}
          </div>
        </>
      ) : (
        <button type="button" className={styles.tagAdd} onClick={() => setPicking(true)} data-testid="co-assignee-open-picker">
          {t('coAssigneesAdd')}
        </button>
      )}
    </>
  );
}
