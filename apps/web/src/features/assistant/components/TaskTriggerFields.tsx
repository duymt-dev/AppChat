// Phần thêm của "Cách chạy" (TIP-035, Blueprint §5.4): agent thực hiện (agent đang chạy; bỏ trống = agent sửa gần nhất) + lịch chạy
// (cron theo giờ workspace, có sẵn vài lịch hay dùng) / sự kiện kích hoạt. Prototype chỉ có ba nút cách chạy — lệch ghi DEVIATIONS.
'use client';
import { useTranslations } from 'next-intl';
import { AI_TASK_EVENTS } from '@appchat/shared';
import { useTaskFormStyles } from '../styles/task-form.styles';
import type { TaskForm } from '../hooks/useTaskForm';
import type { AiTasksPayload } from '../types';

const CRONS = ['0 8 * * *', '0 9 * * 1-5', '0 17 * * *', '0 8 * * 1'];

export function TriggerFields({ f, set, agents }: { f: TaskForm; set: (p: Partial<TaskForm>) => void; agents: AiTasksPayload['agents'] }) {
  const t = useTranslations('assistant.cw.new');
  const { styles } = useTaskFormStyles();
  const briefing = f.template === 'briefing';
  if (briefing && f.trigger === 'manual') return null;
  return (
    <div className={styles.two} data-testid="cw-trigger">
      {briefing ? null : (
        <div>
          <label className={styles.label} htmlFor="cw-agent">
            {t('agent')}
          </label>
          <select id="cw-agent" className={styles.input} value={f.agent} onChange={(e) => set({ agent: e.target.value })}>
            <option value="">{agents.length ? t('agentAuto') : t('agentNone')}</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {f.trigger === 'schedule' ? (
        <div>
          <label className={styles.label} htmlFor="cw-cron">
            {t('cron')}
          </label>
          <select id="cw-cron" className={styles.input} value={CRONS.includes(f.cron) ? f.cron : ''} onChange={(e) => set({ cron: e.target.value || f.cron })}>
            {CRONS.map((c) => (
              <option key={c} value={c}>
                {t(`crons.${CRONS.indexOf(c)}` as never)}
              </option>
            ))}
            {CRONS.includes(f.cron) ? null : <option value="">{f.cron}</option>}
          </select>
        </div>
      ) : null}
      {f.trigger === 'event' ? (
        <div>
          <label className={styles.label} htmlFor="cw-event">
            {t('event')}
          </label>
          <select id="cw-event" className={styles.input} value={f.event} onChange={(e) => set({ event: e.target.value })}>
            {AI_TASK_EVENTS.map((ev) => (
              <option key={ev} value={ev}>
                {t(`events.${ev.replace('.', '_')}` as never)}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
