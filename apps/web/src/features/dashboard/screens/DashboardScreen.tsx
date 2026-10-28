// Tổng quan (orchestrator) — prototype L1079–1177: chào · checklist · thống kê · 4 thẻ · trung tâm cập nhật.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useMe } from '@/shared/shell/useShellData';
import { dashboardQuery } from '../api';
import { useDashStyles } from '../dashboard.styles';
import { AgentsSection } from '../components/AgentsSection';
import { ConnectSection } from '../components/ConnectSection';
import { OnboardingChecklist } from '../components/OnboardingChecklist';
import { PillList, SectionCard } from '../components/SectionCard';
import { StatCards } from '../components/StatCards';
import { UpdatesWidget } from '../components/UpdatesWidget';

export function DashboardScreen() {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const { styles } = useDashStyles();
  const q = useQuery(dashboardQuery());
  const { data: me } = useMe();
  const d = q.data;
  const firstName = me?.user.name.split(' ').pop() ?? '';

  return (
    <div className={styles.wrap} data-testid="dashboard">
      <div className={styles.greet}>
        <div className={styles.grow}>
          <div className={styles.hello}>{t('greeting', { name: firstName })}</div>
          <div className={styles.helloSub}>{t('greetingSub')}</div>
        </div>
        <button type="button" className={styles.cta} onClick={() => router.push('/assistant')}>
          <Icon name="ic-spark" size={16} color={color.white} />
          {t('askAssistant')}
        </button>
      </div>
      <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
        {d ? (
          <>
            <OnboardingChecklist steps={d.onboarding.steps} doneCount={d.onboarding.done_count} />
            <StatCards stats={d.stats} />
            <ConnectSection groups={d.connect_groups} />
            <AgentsSection agents={d.agents} />
            <SectionCard index={3} accent={color.violet} title={t('sections.modules.title')} sub={t('sections.modules.sub')}>
              <PillList items={d.modules} />
            </SectionCard>
            <SectionCard index={4} accent={color.cyan} title={t('sections.cdp.title')} sub={t('sections.cdp.sub')}>
              <PillList items={d.cdp} />
            </SectionCard>
            <UpdatesWidget followUps={d.follow_ups} news={d.news} notifications={d.notifications} />
          </>
        ) : null}
      </PageStates>
    </div>
  );
}
