// Form việc chăm sóc (TIP-026b §3.4) — tạo / sửa / huỷ. Hạn nhập theo giờ workspace (không theo máy) → ISO có offset. Người phụ trách:
// thành viên (server kiểm còn quyền sửa khách — sai 422 hiện dưới ô). Sửa gửi if_version của bản đang mở; 409 giữ nháp + báo.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTimeZone, useTranslations } from 'next-intl';
import { ModalShell, color } from '@appchat/ui';
import { utcToWall, wallToUtc, type TaskItemDto } from '@appchat/shared';
import { transport } from '../api/client';
import { useAction } from '../actions/useAction';
import { useEmailComposeStyles } from '../crm-forms/email-compose.styles';
import type { ActivityFormTarget } from './activity-store';
import { useActivityRow, useFormFrame } from './useActivityForm';
import { useActivityStyles } from './activity.styles';

type Draft = { title: string; description: string; date: string; hm: string; assignee: string };

const membersQuery = { queryKey: ['members'], queryFn: () => transport.get<{ id: string; name: string }[]>('/members'), staleTime: 300_000 };

export function TaskForm({ target }: { target: ActivityFormTarget }) {
  const row = useActivityRow<TaskItemDto>(target.contactId, 'tasks', target.editId);
  const tz = useTimeZone() ?? 'Asia/Ho_Chi_Minh';
  if (target.editId && !row.data) return null;
  const r = row.data;
  const v = target.values ?? {};
  const due = r?.due_at ?? (typeof v.due_at === 'string' ? v.due_at : null);
  const w = due ? utcToWall(new Date(due), tz) : null;
  const initial: Draft = {
    title: r?.title ?? (typeof v.title === 'string' ? v.title : ''),
    description: r?.description ?? (typeof v.description === 'string' ? v.description : ''),
    date: w?.date ?? '',
    hm: w?.hm ?? '',
    assignee: r ? (r.assignee?.id ?? '') : typeof v.assignee_user_id === 'string' ? v.assignee_user_id : '',
  };
  return <TaskFormBody key={`${r?.id ?? 'new'}:${r?.version ?? 0}`} target={target} row={r} initial={initial} tz={tz} />;
}

function TaskFormBody({ target, row, initial, tz }: { target: ActivityFormTarget; row?: TaskItemDto; initial: Draft; tz: string }) {
  const t = useTranslations('common.activities');
  const { styles, cx } = useEmailComposeStyles();
  const { styles: as } = useActivityStyles();
  const f = useFormFrame(initial);
  const members = useQuery(membersQuery).data ?? [];
  const create = useAction('contact_task.create');
  const update = useAction('contact_task.update');
  const cancel = useAction('contact_task.set_state');
  const d = f.draft;
  const fieldsOf = (x: Draft) => ({ title: x.title.trim(), description: x.description, due_at: x.date ? utcToWall(wallToUtc(x.date, x.hm || '09:00', tz), tz).iso : null, assignee_user_id: x.assignee || null });
  const valid = !!d.title.trim() && (!d.hm || !!d.date);
  const save = async () => {
    if (!valid) return;
    const next = fieldsOf(d);
    if (!row) {
      // Không chọn người phụ trách → server giao người đang ra lệnh.
      const { assignee_user_id, ...rest } = next;
      const res = await create.run({ contact_id: target.contactId, ...rest, ...(assignee_user_id ? { assignee_user_id } : {}) });
      if (res) f.done();
      return;
    }
    const prev = fieldsOf(initial) as Record<string, unknown>;
    const patch = Object.fromEntries(Object.entries(next).filter(([k, val]) => val !== prev[k]));
    if (!Object.keys(patch).length) return f.done();
    const res = await update.run({ task_id: row.id, if_version: row.version, patch }, { onError: f.onError });
    if (res) f.done();
  };
  const doCancel = async () => {
    if (!row || !window.confirm(t('form.cancelTaskConfirm'))) return;
    const res = await cancel.run({ task_id: row.id, if_version: row.version, state: 'cancelled' }, { onError: f.onError });
    if (res) f.done();
  };
  const busy = create.isPending || update.isPending || cancel.isPending;
  return (
    <ModalShell
      open
      onClose={f.close}
      width={520}
      title={t(row ? 'form.taskEditTitle' : 'form.taskTitle')}
      icon="ic-check"
      iconColor={color.brandInk}
      iconBg={color.brandBg}
      closeLabel={t('form.cancel')}
      testId="activity-task-form"
      footer={
        <>
          {row && row.state !== 'cancelled' ? (
            <button type="button" className={styles.btn} onClick={() => void doCancel()} disabled={busy} data-testid="task-cancel">
              {t('form.cancelTask')}
            </button>
          ) : null}
          <button type="button" className={styles.btn} onClick={f.close}>
            {t('form.cancel')}
          </button>
          <button type="button" className={cx(styles.btn, styles.primary)} disabled={!valid || busy} onClick={() => void save()} data-testid="activity-save">
            {t('form.save')}
          </button>
        </>
      }
    >
      {f.stale ? (
        <div className={as.error} data-testid="activity-stale">
          {t('stale')}
        </div>
      ) : null}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="act-task-title">
          {t('form.title')}
        </label>
        <input id="act-task-title" className={styles.input} maxLength={200} value={d.title} onChange={(e) => f.set({ title: e.target.value })} data-testid="task-title" autoFocus />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="act-task-date">
          {t('form.due')}
        </label>
        <div className={as.row}>
          <input id="act-task-date" type="date" className={styles.input} value={d.date} onChange={(e) => f.set({ date: e.target.value })} data-testid="task-date" />
          <input type="time" className={styles.input} value={d.hm} onChange={(e) => f.set({ hm: e.target.value })} aria-label={t('form.dueTime')} data-testid="task-time" />
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="act-task-assignee">
          {t('form.assignee')}
        </label>
        <select id="act-task-assignee" className={styles.input} value={d.assignee} onChange={(e) => f.set({ assignee: e.target.value })} data-testid="task-assignee">
          <option value="">{t(row ? 'form.unassigned' : 'form.assignMe')}</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="act-task-desc">
          {t('form.description')}
        </label>
        <textarea id="act-task-desc" className={cx(styles.input, styles.body)} maxLength={5000} value={d.description} onChange={(e) => f.set({ description: e.target.value })} />
      </div>
      <div className={styles.label}>{t('form.taskHint')}</div>
    </ModalShell>
  );
}
