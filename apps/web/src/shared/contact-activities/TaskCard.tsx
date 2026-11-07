// Thẻ "Việc cần làm" (TIP-026b §3.4) — prototype L2413–2420: việc chăm sóc thủ công (≠ tác vụ AI). Ô check gọi contact_task.set_state
// với version đang hiển thị, khoá khi đang chạy; bấm tiêu đề mở form sửa. Watcher chỉ xem (ô check khoá, không "+ Tạo việc").
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import type { ActivitySummaryDto } from '@appchat/shared';
import { useFmt } from '../i18n/useFmt';
import { useActivityUi } from './activity-store';
import { useActivityStyles } from './activity.styles';
import { useActivityActions } from './useActivityActions';

export function TaskCard({ contactId, a }: { contactId: string; a: ActivitySummaryDto }) {
  const t = useTranslations('common.activities');
  const fmt = useFmt();
  const { styles, cx } = useActivityStyles();
  const open = useActivityUi((s) => s.openForm);
  const list = useActivityUi((s) => s.openList);
  const act = useActivityActions(contactId);
  const items = a.tasks.items.filter((x) => x.state !== 'cancelled');
  const [now] = useState(() => Date.now());
  return (
    <div className={styles.card} data-testid="p360-tasks">
      <div className={styles.head}>
        <span className={styles.eyebrow}>{t('tasks')}</span>
        {a.can_edit ? (
          <button type="button" className={styles.link} onClick={() => open({ kind: 'task', contactId })} data-testid="task-add">
            {t('addTask')}
          </button>
        ) : null}
      </div>
      {items.length ? (
        items.map((k) => {
          const done = k.state === 'done';
          const late = !done && !!k.due_at && Date.parse(k.due_at) < now;
          return (
            <div key={k.id} className={styles.task} data-task={k.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={done}
                aria-label={k.title}
                className={cx(styles.check, done && styles.checked)}
                disabled={!a.can_edit || act.pendingTask === k.id}
                onClick={() => void act.toggleTask(k)}
                data-testid="task-check"
              >
                {done ? <Icon name="ic-check" size={10} color={color.white} /> : null}
              </button>
              <button type="button" className={cx(styles.taskTitle, done && styles.done)} onClick={() => a.can_edit && open({ kind: 'task', contactId, editId: k.id })} disabled={!a.can_edit}>
                {k.title}
              </button>
              <span className={cx(styles.due, late && styles.overdue)}>{k.due_at ? `${fmt.date(k.due_at)} ${fmt.time(k.due_at)}` : t('noDue')}</span>
            </div>
          );
        })
      ) : (
        <div className={styles.empty}>{t('tasksEmpty')}</div>
      )}
      {a.tasks.next_cursor ? (
        <button type="button" className={styles.more} onClick={() => list(contactId, 'tasks')}>
          {t('seeAll')}
        </button>
      ) : null}
    </div>
  );
}
