// Drawer thành viên (400px) — prototype L4667–4733: đầu (avatar, tên, SĐT, hạng, Điểm hiện có / Tổng tích luỹ) + 5 tab.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { EntityDrawer, color, layout } from '@appchat/ui';
import { useDrawerStyles } from '../styles/drawer.styles';
import { useLoyaltyUi, type MemberTab } from '../loyalty-store';
import { memberQuery } from '../api';
import { TIER_TONE, avColor, initial, pts } from '../status';
import type { LoyaltyOverview, Member } from '../types';
import { AiTab, FilesTab, HistoryTab, LadderTab, OverviewTab } from './MemberTabs';

const TABS: MemberTab[] = ['overview', 'crm', 'ai', 'files', 'history'];

function Head({ m }: { m: Member }) {
  const t = useTranslations('loyalty.dr');
  const tt = useTranslations('loyalty.tier');
  const { styles } = useDrawerStyles();
  const tone = TIER_TONE[m.tier] ?? color.slateAvatar;
  return (
    <div>
      <div className={styles.who}>
        <span className={styles.av} style={{ background: avColor(m.name) }}>
          {initial(m.name)}
        </span>
        <div className={styles.grow}>
          <div className={styles.name}>{m.name}</div>
          <div className={styles.meta}>
            <span className={styles.phone}>{m.phone}</span>
            <span className={styles.tier} style={{ background: `${tone}18`, color: tone }} data-testid="ly-dr-tier">
              {t('tierBadge', { t: tt(m.tier) })}
            </span>
          </div>
        </div>
      </div>
      <div className={styles.boxes}>
        <div className={styles.curBox}>
          <div>{t('cur')}</div>
          <div data-testid="ly-dr-points">{pts(m.points)}</div>
        </div>
        <div className={styles.accBox}>
          <div>{t('earned')}</div>
          <div>{pts(m.earned)}</div>
        </div>
      </div>
    </div>
  );
}

export function MemberDrawer({ data }: { data: LoyaltyOverview }) {
  const t = useTranslations('loyalty.dr');
  const { styles } = useDrawerStyles();
  const id = useLoyaltyUi((s) => s.detail);
  const tab = useLoyaltyUi((s) => s.tab);
  const set = useLoyaltyUi((s) => s.set);
  const m = useQuery({ ...memberQuery(id ?? ''), enabled: !!id }).data;
  const ready = !!id && !!m && m.contact_id === id;
  return (
    <EntityDrawer
      open={!!id}
      onClose={() => set({ detail: null })}
      title={m?.name ?? ''}
      header={ready ? <Head m={m} /> : null}
      tabs={TABS.map((k) => ({ key: k, label: t(`tabs.${k}`) }))}
      tab={tab}
      onTab={(k) => set({ tab: k as MemberTab })}
      muted
      width={layout.tkDrawer}
      closeLabel={t('close')}
      testId="ly-drawer"
    >
      {ready ? (
        <div className={styles.body}>
          {tab === 'overview' ? <OverviewTab m={m} /> : null}
          {tab === 'crm' ? <LadderTab m={m} /> : null}
          {tab === 'ai' ? <AiTab m={m} /> : null}
          {tab === 'files' ? <FilesTab data={data} /> : null}
          {tab === 'history' ? <HistoryTab m={m} /> : null}
        </div>
      ) : null}
    </EntityDrawer>
  );
}
