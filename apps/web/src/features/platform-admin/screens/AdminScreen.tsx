// Màn Quản trị nền tảng /admin (TIP-040, DC-368): orchestrator — tab theo `?tab=` (deep link), mỗi tab một panel riêng. Không AppShell /
// ô chọn workspace (ngữ cảnh nền tảng); không có prototype — dựng bằng primitive + token (PD-022, không tuyên bố parity pixel).
'use client';
import { Tabs, Typography } from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAdminStyles } from '../styles/admin.styles';
import { ADMIN_TABS, type AdminTab } from '../types';
import { WorkspaceTable } from '../components/WorkspaceTable';
import { PlansPanel } from '../components/PlansPanel';
import { ProviderPanel } from '../components/ProviderPanel';
import { ModelRoutesPanel } from '../components/ModelRoutesPanel';
import { ModelPricesPanel } from '../components/ModelPricesPanel';
import { TransfersPanel } from '../components/TransfersPanel';
import { TemplatesPanel } from '../components/TemplatesPanel';
import { FreezeRequestsPanel } from '../components/FreezeRequestsPanel';

const PANELS: Record<AdminTab, () => React.JSX.Element> = {
  workspaces: WorkspaceTable,
  plans: PlansPanel,
  providers: ProviderPanel,
  routes: ModelRoutesPanel,
  prices: ModelPricesPanel,
  transfers: TransfersPanel,
  freeze: FreezeRequestsPanel,
  templates: TemplatesPanel,
};

export function AdminScreen() {
  const t = useTranslations('platformAdmin');
  const { styles } = useAdminStyles();
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get('tab');
  const tab: AdminTab = (ADMIN_TABS as readonly string[]).includes(raw ?? '') ? (raw as AdminTab) : 'workspaces';
  return (
    <main className={styles.page} data-testid="adm-screen">
      <Typography.Title level={1} className={styles.title}>
        {t('title')}
      </Typography.Title>
      <Tabs
        activeKey={tab}
        onChange={(k) => router.replace(`/admin?tab=${k}`)}
        destroyOnHidden
        items={ADMIN_TABS.map((k) => {
          const Panel = PANELS[k];
          return { key: k, label: <span data-testid={`adm-tab-${k}`}>{t(`tabs.${k}`)}</span>, children: <Panel /> };
        })}
      />
    </main>
  );
}
