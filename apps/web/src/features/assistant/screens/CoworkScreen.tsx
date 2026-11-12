// Tác vụ tự chủ (orchestrator) — prototype L1314–1424: tiêu đề + Chat/Cowork + "Tạo tác vụ tự chủ", 6 chỉ số, lưới tác vụ,
// composer giao việc, modal tạo tác vụ, drawer cấu hình.
'use client';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useAssistantStyles } from '../styles/assistant.styles';
import { useCoworkStyles } from '../styles/cowork.styles';
import { useComposerStyles } from '../styles/composer.styles';
import { useAssistantUi } from '../assistant-store';
import { useAssistantChat } from '../hooks/useAssistantChat';
import { tasksQuery } from '../api';
import { AssistantTopBar } from '../components/AssistantTopBar';
import { Composer } from '../components/Composer';
import { ComposerPopovers } from '../components/ComposerPopovers';
import { TaskCard } from '../components/TaskCard';
import { TaskCreateModal } from '../components/TaskCreateModal';
import { useAssistantUiCommands } from '../ui-commands';
import { Opened, lazyDrawer } from '@/shared/dynamic/lazy-drawers';

const TaskDrawer = lazyDrawer(() => import('../components/TaskDrawer').then((m) => m.TaskDrawer));

export function CoworkScreen() {
  useAssistantUiCommands();
  const t = useTranslations('assistant');
  const router = useRouter();
  const { styles: page } = useAssistantStyles();
  const { styles } = useCoworkStyles();
  const { styles: cs, cx } = useComposerStyles();
  const ui = useAssistantUi();
  const chat = useAssistantChat();
  const q = useQuery(tasksQuery());
  const pause = useAction('ai_task.pause');
  const canManage = useCan('ai_task.manage');
  const d = q.data;
  useEffect(() => {
    useAssistantUi.getState().set({ mode: 'cowork' });
  }, []);
  const goChat = () => {
    ui.set({ mode: 'chat', agent: null });
    router.push('/assistant');
  };
  const send = () => {
    ui.set({ mode: 'cowork' });
    void chat.send();
    router.push('/assistant');
  };

  return (
    <div className={page.root} data-testid="cowork">
      <AssistantTopBar crumb="cowork" />
      <div className={styles.page}>
        <div className={styles.head}>
          <div className={styles.title}>{t('cw.title')}</div>
          <span className={styles.sub}>{t('cw.sub')}</span>
          <span className={styles.grow} />
          <div className={cs.seg} role="radiogroup" style={{ marginRight: 8 }}>
            <button type="button" role="radio" aria-checked={false} className={cs.segBtn} onClick={goChat}>
              {t('mode.chat')}
            </button>
            <button type="button" role="radio" aria-checked className={cx(cs.segBtn, cs.segOn)}>
              {t('mode.cowork')}
            </button>
          </div>
          {canManage ? (
            <button type="button" className={styles.create} onClick={() => ui.set({ taskNew: true })} data-testid="cw-create">
              <Icon name="ic-plus" size={13} color={color.white} strokeWidth={2} />
              {t('cw.create')}
            </button>
          ) : null}
        </div>
        <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
          <div className={styles.stats}>
            {d?.stats.map((s) => (
              <div key={s.key} className={styles.stat}>
                <div className={styles.statHead}>
                  <Icon name={s.icon as IconName} size={15} color={s.color} />
                  {t(`cw.stats.${s.key}` as never)}
                </div>
                <div className={styles.statVal}>{s.value}</div>
              </div>
            ))}
          </div>
          <div className={styles.grid}>
            {d?.tasks.map((a) => (
              <TaskCard
                key={a.id}
                task={a}
                departments={d.departments}
                onOpen={() => ui.set({ taskOpen: a.id })}
                onToggle={canManage ? () => void pause.run({ task_id: a.id, paused: a.active }) : undefined}
              />
            ))}
          </div>
        </PageStates>
        <div className={styles.composer}>
          <Composer rows={2} placeholder={t('placeholderCowork')} onSend={send} onMode={(m) => (m === 'chat' ? goChat() : undefined)} testId="cw-composer" />
        </div>
      </div>
      {d ? <TaskCreateModal data={d} /> : null}
      <Opened name="task-drawer" when={!!ui.taskOpen && !!d} keep={false} onClose={() => ui.set({ taskOpen: null })}>
        {d ? <TaskDrawer data={d} /> : null}
      </Opened>
      <ComposerPopovers />
    </div>
  );
}
