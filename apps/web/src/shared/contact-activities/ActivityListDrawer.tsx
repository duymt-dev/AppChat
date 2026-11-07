// Danh sách đầy đủ một loại hoạt động (TIP-026b §3.2, §3.4) — phân trang cursor thật (> 30 bản ghi vẫn xem được), không tải hết giả cursor.
// Bấm một việc / cơ hội mở form sửa (chỉ khi sửa được — theo tóm tắt can_edit của Hồ sơ 360°).
'use client';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { EntityDrawer } from '@appchat/ui';
import type { NoteItemDto, OpportunityItemDto, TaskItemDto } from '@appchat/shared';
import { useFmt } from '../i18n/useFmt';
import { activitiesQuery } from './api';
import { useActivityUi } from './activity-store';
import { useActivityStyles } from './activity.styles';

export function ActivityListDrawer() {
  const list = useActivityUi((s) => s.list);
  if (!list) return null;
  return <ListBody contactId={list.contactId} kind={list.kind} />;
}

function ListBody({ contactId, kind }: { contactId: string; kind: 'notes' | 'comments' | 'tasks' | 'opportunities' }) {
  const t = useTranslations('common.activities');
  const fmt = useFmt();
  const { styles, cx } = useActivityStyles();
  const close = useActivityUi((s) => s.closeList);
  const open = useActivityUi((s) => s.openForm);
  const q = useInfiniteQuery(activitiesQuery(contactId, kind));
  const items = q.data?.pages.flatMap((p) => p.data) ?? [];
  const at = (iso: string) => `${fmt.date(iso)} ${fmt.time(iso)}`;
  return (
    <EntityDrawer open onClose={close} title={t(`list.${kind}`)} icon="ic-doc" closeLabel={t('form.cancel')} testId="activity-list" muted>
      <div className={styles.card}>
        {items.map((x) => {
          if (kind === 'tasks') {
            const k = x as TaskItemDto;
            return (
              <div key={k.id} className={styles.task}>
                <button type="button" className={cx(styles.taskTitle, k.state !== 'open' && styles.done)} onClick={() => open({ kind: 'task', contactId, editId: k.id })}>
                  {k.title}
                </button>
                <span className={styles.due}>{t(`taskState.${k.state}`)}</span>
              </div>
            );
          }
          if (kind === 'opportunities') {
            const o = x as OpportunityItemDto;
            return (
              <div key={o.id} className={styles.task}>
                <button type="button" className={styles.taskTitle} onClick={() => open({ kind: 'opportunity', contactId, editId: o.id })}>
                  {o.title}
                </button>
                <span className={styles.stage}>{t(`stage.${o.stage}`)}</span>
              </div>
            );
          }
          const n = x as NoteItemDto;
          return (
            <div key={n.id} className={styles.comment}>
              <div className={cx(styles.avatar, n.author.type !== 'user' && styles.agent)}>{(n.author.name[0] ?? '?').toUpperCase()}</div>
              <div>
                <div className={styles.author}>{n.author.name}</div>
                <div className={styles.body}>{n.body}</div>
                <div className={styles.meta}>{at(n.created_at)}</div>
              </div>
            </div>
          );
        })}
        {!items.length && !q.isLoading ? <div className={styles.empty}>{t('listEmpty')}</div> : null}
        {q.isLoading ? <div className={styles.empty}>{t('loading')}</div> : null}
        {q.hasNextPage ? (
          <button type="button" className={styles.more} disabled={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()} data-testid="activity-more">
            {t('loadMore')}
          </button>
        ) : null}
      </div>
    </EntityDrawer>
  );
}
