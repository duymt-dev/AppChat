// Chọn người phụ trách (TIP-025b §B.6) — submenu "Phân công" của menu ⋯ (prototype L2005): ứng viên hiện hành theo trang (người + agent
// đang chạy nhận kênh này), kèm tải mở và phiên bản agent; tìm theo tên; "Xem thêm" tải trang kế (không cắt ở trang agent đầu). Không
// có inbox.assign → không gọi, báo không quyền. Ghi vẫn chỉ qua conversation.assign.
'use client';
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useCan } from '@/shared/authz/useCan';
import { useRowStyles } from '../styles/row.styles';
import { assigneesQuery } from '../assign-api';

export function AssignPicker({ convId, onPick }: { convId: string; onPick: (id: string, isAgent: boolean) => void }) {
  const t = useTranslations('inbox.list');
  const { styles, cx } = useRowStyles();
  const allowed = useCan('inbox.assign');
  const [q, setQ] = useState('');
  const list = useInfiniteQuery(assigneesQuery(convId, q.trim(), allowed));
  const rows = list.data?.pages.flatMap((p) => p.data) ?? [];

  if (!allowed) return <div className={styles.tagHint}>{t('assignDenied')}</div>;
  return (
    <>
      <div className={styles.tagNewRow}>
        <input className={styles.tagInput} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('assignSearch')} aria-label={t('assignSearch')} data-testid="assign-search" />
      </div>
      <div className={styles.subList} data-testid="assign-list">
        {list.isError ? <div className={styles.tagHint}>{t('assignError')}</div> : null}
        {list.isLoading ? <div className={styles.tagHint}>{t('assignLoading')}</div> : null}
        {!list.isLoading && !list.isError && !rows.length ? <div className={styles.tagHint}>{t('assignEmpty')}</div> : null}
        {rows.map((a) => (
          <button key={`${a.kind}:${a.id}`} type="button" className={styles.item} onClick={() => onPick(a.id, a.kind === 'agent')} aria-current={a.current || undefined} data-testid={`assign-${a.kind}-${a.id}`}>
            <span className={cx(styles.dot, a.current && styles.dotOn)} />
            <div className={styles.grow}>
              <div>{a.name}</div>
              <div className={styles.subMeta}>
                {t(a.kind === 'agent' ? 'assignAgentHint' : 'assignUserHint', { role: a.role, load: a.load, version: a.version ?? 0 })}
              </div>
            </div>
          </button>
        ))}
        {list.hasNextPage ? (
          <button type="button" className={styles.item} onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage}>
            <span className={styles.grow}>{t('assignMore')}</span>
          </button>
        ) : null}
      </div>
    </>
  );
}
