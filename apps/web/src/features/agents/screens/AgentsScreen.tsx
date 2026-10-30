// AI Agents — prototype L2227–2289: tiêu đề + "Tạo thủ công" + "Trợ lý AI" (ẩn "Mở Workflow" — OUT), thư viện mẫu,
// "Agent của bạn" (bật / tạm dừng, phiên bản, xoá), drawer Trợ lý thu nhỏ, drawer lịch sử phiên bản.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AiButton, Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useAgentsStyles } from '../styles/agents.styles';
import { useMineStyles } from '../styles/mine.styles';
import { useAgentsUi } from '../agents-store';
import { agentsQuery, metaQuery } from '../api';
import { TemplateGallery } from '../components/TemplateGallery';
import { AgentCard } from '../components/AgentCard';
import { AgentAiDrawer } from '../components/AgentAiDrawer';
import { VersionsDrawer } from '../components/VersionsDrawer';
import { useAgentsUiCommands } from '../ui-commands';

export function AgentsScreen() {
  useAgentsUiCommands();
  const t = useTranslations('agents');
  const tc = useTranslations('common');
  const router = useRouter();
  const { styles } = useAgentsStyles();
  const { styles: ms } = useMineStyles();
  const ui = useAgentsUi();
  const canManage = useCan('agents.manage');
  const meta = useQuery(metaQuery());
  const list = useQuery(agentsQuery());
  const pause = useAction('agent.pause');
  const del = useAction('agent.delete');
  const agents = list.data?.data ?? [];

  return (
    <div className={styles.page} data-testid="agents">
      <div className={styles.head}>
        <div className={styles.title}>{t('title')}</div>
        <span className={styles.sub}>{t('sub')}</span>
        <span className={styles.grow} />
        {canManage ? (
          <>
            <button type="button" className={styles.btn} onClick={() => router.push('/agents/new')} data-testid="ag-new">
              <Icon name="ic-plus" size={14} color={color.text3} strokeWidth={2} />
              {t('manual')}
            </button>
            <AiButton label={tc('aiButton')} module={t('title')} onClick={() => ui.set({ aiOpen: true })} testId="ag-ai" />
          </>
        ) : null}
      </div>
      <PageStates state={stateOf(meta)} onRetry={() => void meta.refetch()}>
        {meta.data ? <TemplateGallery meta={meta.data} onPick={(tpl) => router.push(`/agents/new?template=${tpl.id}`)} /> : null}
      </PageStates>
      <section className={ms.wrap} data-testid="ag-mine">
        <div className={styles.secHead}>
          <Icon name="ic-bot" size={17} color={color.brand} strokeWidth={1.9} />
          <div className={styles.secTitle}>{t('tabs.mine', { n: agents.length })}</div>
        </div>
        <div className={styles.secSub}>{t('mine.sub')}</div>
        <PageStates state={stateOf(list)} onRetry={() => void list.refetch()}>
          {agents.length ? (
            <div className={ms.grid}>
              {agents.map((a) => (
                <AgentCard
                  key={a.id}
                  agent={a}
                  canManage={canManage}
                  onEdit={() => router.push(`/agents/${a.id}`)}
                  onToggle={() => void pause.run({ agent_id: a.id, paused: a.status === 'active' })}
                  onVersions={() => ui.set({ versionsFor: a.id })}
                  onDelete={() => void del.run({ agent_id: a.id })}
                />
              ))}
            </div>
          ) : (
            <div className={ms.empty}>{t('mine.empty')}</div>
          )}
        </PageStates>
      </section>
      {meta.data ? <AgentAiDrawer meta={meta.data} /> : null}
      <VersionsDrawer agents={agents} />
    </div>
  );
}
