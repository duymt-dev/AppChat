// Khách thân thiết (orchestrator) — prototype L4412–4740: topbar (tìm · Thêm thành viên · Trợ lý AI), Tổng quan 5 ô, bảng thành viên,
// cảnh báo rời bỏ, quy tắc tích điểm; hộp Thêm thành viên & ghi nhận điểm (3 bước), Cấu hình hạng & điểm, Thử nghiệm tính điểm, drawer thành viên.
// Luật COMMERCE §7 thắng prototype (điểm chỉ cộng khi đơn hoàn tất; không có builder quy tắc tự do).
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useCan } from '@/shared/authz/useCan';
import { useShellStore } from '@/shared/shell/shell-store';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useLoyaltyStyles } from '../styles/loyalty.styles';
import { useLoyaltyUi } from '../loyalty-store';
import { loyaltyOverviewQuery, membersQuery } from '../api';
import { OverviewCard } from '../components/OverviewCard';
import { MemberTable } from '../components/MemberTable';
import { ChurnCard } from '../components/ChurnCard';
import { RulesCard } from '../components/RulesCard';
import { AdjustPointsModal } from '../components/AdjustPointsModal';
import { ConfigModal } from '../components/ConfigModal';
import { SimulatorModal } from '../components/SimulatorModal';
import { MemberDrawer } from '../components/MemberDrawer';
import { useLoyaltyUiCommands } from '../ui-commands';

export function LoyaltyScreen() {
  useLoyaltyUiCommands();
  const t = useTranslations('loyalty');
  const { styles } = useLoyaltyStyles();
  const ui = useLoyaltyUi();
  const setDock = useShellStore((s) => s.setDock);
  const canAdjust = useCan('loyalty.adjust');
  const ov = useQuery(loyaltyOverviewQuery());
  const list = useQuery(membersQuery(ui.filter, ui.pg));
  return (
    <div className={styles.wrap} data-testid="loyalty">
      <div className={styles.top}>
        <div className={styles.title}>{t('title')}</div>
        <span className={styles.sub}>{t('sub')}</span>
        <span className={styles.grow} />
        <div className={styles.search}>
          <Icon name="ic-search" size={14} color={color.text4} strokeWidth={1.9} />
          <input
            value={ui.filter.q}
            onChange={(e) => ui.setFilter({ q: e.target.value })}
            placeholder={t('search')}
            aria-label={t('search')}
            data-testid="ly-search"
          />
        </div>
        {canAdjust ? (
          <button type="button" className={styles.primary} onClick={() => ui.set({ adjust: true, adjustFor: null })} data-testid="ly-add">
            <Icon name="ic-plus" size={14} color={color.white} strokeWidth={2.2} />
            {t('add')}
          </button>
        ) : null}
        <button type="button" className={styles.dark} onClick={() => setDock(true)}>
          <Icon name="ic-spark" size={14} color={color.sparkMint} strokeWidth={1.9} />
          {t('ai')}
        </button>
      </div>
      <PageStates state={stateOf(ov)} onRetry={() => void ov.refetch()}>
        {ov.data ? (
          <>
            <OverviewCard data={ov.data} />
            <MemberTable rows={list.data?.data ?? []} meta={list.data?.meta} />
            <ChurnCard data={ov.data} />
            <RulesCard data={ov.data} />
            <MemberDrawer data={ov.data} />
          </>
        ) : null}
      </PageStates>
      <AdjustPointsModal />
      <ConfigModal />
      <SimulatorModal />
    </div>
  );
}
