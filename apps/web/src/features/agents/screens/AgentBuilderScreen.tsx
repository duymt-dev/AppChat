// Builder tạo / cấu hình AI Agent (toàn màn) — prototype L2291–2419. E: mức AI thay tên model (D29), kênh theo registry,
// bỏ hành động OUT; "Xuất bản" = agent.create_and_publish (mới) hoặc agent.update + agent.publish (sửa).
'use client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { PageStates } from '@/shared/states/PageStates';
import { useBuilderStyles } from '../styles/builder.styles';
import { metaQuery } from '../api';
import { useAgentBuilder, useBuilderSeed } from '../hooks/useAgentBuilder';
import { BasicsSection } from '../components/builder/BasicsSection';
import { GuidanceSection } from '../components/builder/GuidanceSection';
import { RoutingSection } from '../components/builder/RoutingSection';
import { ActionsSection } from '../components/builder/ActionsSection';
import { TestPanel } from '../components/builder/TestPanel';
import type { AgentConfig, AgentsMeta } from '../types';

interface FormProps {
  seed: AgentConfig;
  meta: AgentsMeta;
  agentId?: string;
  title: string;
}

function BuilderForm({ seed, meta: m, agentId, title }: FormProps) {
  const t = useTranslations('agents.b');
  const { styles } = useBuilderStyles();
  const b = useAgentBuilder(seed, agentId);

  return (
    <>
      <div className={styles.bar}>
        <button type="button" className={styles.back} onClick={b.close} aria-label={t('back')}>
          <Icon name="ic-arrow" size={18} color={color.text3} strokeWidth={2} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <div className={styles.barTitle}>{title}</div>
        <span className={styles.grow} />
        <button type="button" className={styles.cancel} onClick={b.close} data-testid="agb-cancel">
          {t('cancel')}
        </button>
        <button type="button" className={styles.publish} onClick={() => void b.save()} disabled={!b.cfg.name.trim() || b.saving} data-testid="agb-publish">
          <Icon name="ic-check" size={14} color={color.white} strokeWidth={2} />
          {t('publish')}
        </button>
      </div>
      <div className={styles.body}>
        <div className={styles.left}>
          <div className={styles.col}>
            <BasicsSection cfg={b.cfg} patch={b.patch} emojis={m.emojis} />
            <GuidanceSection cfg={b.cfg} patch={b.patch} templates={m.prompt_templates} />
            <RoutingSection cfg={b.cfg} meta={m} toggle={(k, v) => b.toggleIn(k, v as never)} />
            <ActionsSection cfg={b.cfg} patch={b.patch} meta={m} toggleTool={(k) => b.toggleIn('tools', k)} />
          </div>
        </div>
        <div className={styles.right}>
          <TestPanel cfg={b.cfg} agentId={agentId} seed={m.test_seed} />
        </div>
      </div>
    </>
  );
}

export function AgentBuilderScreen({ agentId }: { agentId?: string }) {
  const t = useTranslations('agents.b');
  const router = useRouter();
  const { styles } = useBuilderStyles();
  const meta = useQuery(metaQuery());
  const { seed, edit } = useBuilderSeed(agentId);
  const title = edit ? t('editTitle') : t('createTitle');

  return (
    <div className={styles.root} role="dialog" aria-modal="true" aria-label={title} data-testid="agent-builder">
      {meta.data && seed ? (
        <BuilderForm seed={seed} meta={meta.data} agentId={agentId} title={title} />
      ) : (
        <PageStates state={meta.isError ? 'error' : 'loading'} onRetry={() => router.refresh()}>
          {null}
        </PageStates>
      )}
    </div>
  );
}
