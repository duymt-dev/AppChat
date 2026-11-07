// Drawer chi tiết kết nối (TIP-012b P3 §5.2): sức khoẻ từ bằng chứng, "Đồng bộ ngay" (biên nhận accepted ≠ xong — hiện "đang đồng bộ"
// tới khi lượt kéo kết thúc), nhật ký lệnh gọi phân trang. Kết nối không hỗ trợ kéo → nút ẩn, ghi rõ "chỉ nhận webhook". Ngắt kết nối
// / nhập lại khoá vẫn ở hộp kết nối (ConnectIntegrationModal). P5: kết nối ngân hàng chưa bật đối soát tiền → "Bật đối soát tiền"
// (finance.manage, bank_feed.connect theo connection_id — dùng khoá đã lưu).
'use client';
import { useTranslations } from 'next-intl';
import { EntityDrawer } from '@appchat/ui';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useCan } from '@/shared/authz/useCan';
import { useSectionStyles } from '../styles/section.styles';
import { useIntegDetailStyles } from '../styles/integration-detail.styles';
import { useIntegrationDetail } from '../hooks/useIntegrationDetail';
import { HealthPill, IntegrationHealth } from './IntegrationHealth';
import { IntegrationCallLog } from './IntegrationCallLog';

export function IntegrationDetailDrawer({ connectionId, onClose, onManage }: { connectionId: string | null; onClose: () => void; onManage: () => void }) {
  const t = useTranslations('settings.integrations.detail');
  const { styles } = useIntegDetailStyles();
  const s = useSectionStyles().styles;
  const can = useCan('integrations.manage');
  const canFinance = useCan('finance.manage');
  const { detail, logs, calls, syncNow, syncing, bindFeed, binding } = useIntegrationDetail(connectionId);
  if (!connectionId) return null;
  const d = detail.data;
  const pending = d?.pending_call;
  return (
    <EntityDrawer
      open
      onClose={onClose}
      title={d?.name ?? t('title')}
      icon="ic-link"
      subtitle={d ? <HealthPill health={d.health} /> : null}
      closeLabel={t('close')}
      width={520}
      testId="st-int-drawer"
      footer={
        <div className={styles.foot}>
          <button type="button" className={s.ghost} onClick={onManage} data-testid="st-int-manage">
            {t('manage')}
          </button>
          <span className={styles.grow} />
          {canFinance && d?.port === 'bank_feed' && !d.bank_binding?.active ? (
            <button type="button" className={s.ghost} onClick={() => void bindFeed()} disabled={binding} data-testid="st-int-bind">
              {t('bind')}
            </button>
          ) : null}
          {can && d?.capabilities.pull ? (
            <button type="button" className={s.primary} onClick={() => void syncNow()} disabled={syncing || !!pending} data-testid="st-int-sync">
              {pending ? t('syncing') : t('sync')}
            </button>
          ) : null}
        </div>
      }
    >
      <PageStates state={stateOf(detail)} onRetry={() => void detail.refetch()}>
        {d ? (
          <div className={styles.body}>
            {!d.capabilities.pull && d.capabilities.webhook ? <div className={styles.note}>{t('webhookOnly')}</div> : null}
            {pending ? (
              <div className={styles.note} role="status" data-testid="st-int-pending">
                {t('pending', { status: t(`call.${pending.status}`) })}
              </div>
            ) : null}
            <IntegrationHealth d={d} />
            <IntegrationCallLog calls={calls} more={!!logs.hasNextPage} onMore={() => void logs.fetchNextPage()} loading={logs.isFetchingNextPage} />
          </div>
        ) : null}
      </PageStates>
    </EntityDrawer>
  );
}
