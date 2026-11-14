// Marketing (orchestrator) — prototype L3394–3533: topbar · tab kênh · hero kênh / 4 KPI · tab trạng thái · lọc · DataTable chiến dịch · phân trang,
// cùng modal AI phân tích (đề xuất), wizard 4 bước, trang chi tiết chiến dịch, panel Trợ lý AI · Marketing.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { DataTable } from '@appchat/ui';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useMarketingStyles } from '../styles/marketing.styles';
import { useMarketingUi } from '../marketing-store';
import { campaignsQuery, marketingMetaQuery } from '../api';
import { CampaignCard, useCampaignColumns } from '../columns';
import { MarketingHeader } from '../components/MarketingHeader';
import { AnalyzeModal } from '../components/AnalyzeModal';
import { CampaignDetail } from '../components/CampaignDetail';
import type { Campaign } from '../types';
import { useMarketingUiCommands } from '../ui-commands';
import { ListPager } from '@/shared/list/ListPager';
import { useAssistantContext } from '../hooks/useAssistantContext';
import { Opened, lazyDrawer } from '@/shared/dynamic/lazy-drawers';

const CampaignWizard = lazyDrawer(() => import('../components/CampaignWizard').then((m) => m.CampaignWizard));
const MarketingAiDrawer = lazyDrawer(() => import('../components/MarketingAiDrawer').then((m) => m.MarketingAiDrawer));

export function MarketingScreen() {
  useMarketingUiCommands();
  useAssistantContext();
  const t = useTranslations('marketing');
  const { styles } = useMarketingStyles();
  const ui = useMarketingUi();
  const list = useQuery(campaignsQuery(ui.filter, ui.pg));
  const meta = useQuery(marketingMetaQuery()).data;
  const rows = list.data?.data ?? [];
  const columns = useCampaignColumns();
  return (
    <div className={styles.wrap} data-testid="marketing">
      <MarketingHeader meta={meta} />
      <PageStates state={stateOf(list)} onRetry={() => void list.refetch()}>
        <DataTable<Campaign>
          testId="mk-table"
          footer={<ListPager meta={list.data?.meta} unit={t('unit')} onChange={ui.setPg} testId="mk-table-pager" />}
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          minWidth={1080}
          onRowClick={(r) => ui.set({ detail: r.id, tab: 'recipients' })}
          rowProps={(r) => ({ 'data-campaign': r.id })}
          mobileCard={(r) => <CampaignCard c={r} />}
          emptyText={t('empty')}
        />
      </PageStates>
      {meta ? <AnalyzeModal meta={meta} /> : null}
      <Opened name="campaign-wizard" when={ui.wizard && !!meta} keep={false} onClose={() => ui.set({ wizard: false })}>
        {meta ? <CampaignWizard meta={meta} /> : null}
      </Opened>
      <Opened name="marketing-ai" when={ui.aiOpen && !!meta} onClose={() => ui.set({ aiOpen: false })}>
        {meta ? <MarketingAiDrawer meta={meta} /> : null}
      </Opened>
      <CampaignDetail />
    </div>
  );
}
