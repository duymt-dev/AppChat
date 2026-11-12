// Mục Kênh kết nối — prototype L5892–5944: lọc Tất cả / Đã kết nối / Chưa kết nối, đổi Danh sách / Dạng thẻ (mặc định thẻ, nhóm theo loại).
// Chỉ kênh có manifest (Zalo cá nhân, Website, Email) liên kết được; còn lại nhãn "Sắp có" (omnichannel-adapter, D28).
'use client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useCan } from '@/shared/authz/useCan';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useSectionStyles } from '../styles/section.styles';
import { useChannelsStyles } from '../styles/channels.styles';
import { useSettingsUi } from '../settings-store';
import { channelsQuery } from '../api';
import type { Channel } from '../types';
import { ChannelCard } from './ChannelCard';
import { ConnectChannelModal } from './ConnectChannelModal';
import { ManageChannelDrawer } from './ManageChannelDrawer';
import { useFmt } from '@/shared/i18n/useFmt';

const WIDGET = '/settings/web_widget';

const FILTERS = ['all', 'on', 'off'] as const;
const GROUPS = ['msg', 'web', 'shop'] as const;

function ListRow({ c }: { c: Channel }) {
  const t = useTranslations('settings.channels');
  const fmt = useFmt();
  const router = useRouter();
  const { styles, cx } = useChannelsStyles();
  const set = useSettingsUi((s) => s.set);
  const can = useCan('channels.manage');
  const open = () => {
    if (c.connected) return set({ channelDrawer: { type: c.type, accountId: null } });
    if (c.type === 'webchat') return router.push(WIDGET);
    return set({ channelWizard: { type: c.type, step: 2 } });
  };
  return (
    <div className={cx(useSectionStyles().styles.tr, styles.lGrid)} data-channel={c.type}>
      <div className={styles.lWho}>
        <span className={styles.lIc} style={{ background: c.color }}>
          {c.short}
        </span>
        <div className={styles.grow}>
          <div className={styles.lName}>{c.name}</div>
          <div className={styles.lAcc}>{c.connected ? c.account : t(c.available ? 'notLinked' : 'soonD')}</div>
        </div>
      </div>
      <span className={c.connected ? styles.stOn : styles.stOff}>
        <span className={styles.stDot} />
        {t(c.connected ? 'on' : 'off')}
      </span>
      <span className={styles.num}>{fmt.number(c.convs)}</span>
      <span className={styles.frt}>{c.frt}</span>
      <span>
        {c.agent ? (
          <span className={styles.ai}>
            <Icon name="ic-spark" size={11} color={color.violet} />
            {c.agent}
          </span>
        ) : null}
      </span>
      <div className={styles.lAct}>
        {can ? (
          <button
            type="button"
            className={c.connected ? styles.btnManage : c.available ? styles.btnConnect : styles.btnSoon}
            disabled={!c.available}
            onClick={open}
          >
            {t(c.connected ? 'manage' : c.available ? 'connect' : 'soon')}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ChannelsSection() {
  const t = useTranslations('settings.channels');
  const s = useSectionStyles();
  const { styles, cx } = useChannelsStyles();
  const ui = useSettingsUi();
  const q = useQuery(channelsQuery(ui.chanFilter));
  const rows = q.data ?? [];
  return (
    <>
      <div className={styles.bar}>
        <div className={styles.pills}>
          {FILTERS.map((f) => (
            <button key={f} type="button" className={cx(styles.pill, ui.chanFilter === f && styles.pillOn)} onClick={() => ui.set({ chanFilter: f })} data-testid={`st-ch-f-${f}`}>
              {t(`filter.${f}`)}
            </button>
          ))}
        </div>
        <span className={s.styles.grow} />
        <div className={styles.seg}>
          <button type="button" className={cx(styles.segBtn, ui.chanView === 'list' && styles.segOn)} onClick={() => ui.set({ chanView: 'list' })} data-testid="st-ch-list">
            <Icon name="ic-inbox" size={13} color="currentColor" strokeWidth={1.9} />
            {t('list')}
          </button>
          <button type="button" className={cx(styles.segBtn, ui.chanView === 'cards' && styles.segOn)} onClick={() => ui.set({ chanView: 'cards' })} data-testid="st-ch-cards">
            <Icon name="ic-grid" size={13} color="currentColor" strokeWidth={1.9} />
            {t('cards')}
          </button>
        </div>
      </div>
      <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
        {ui.chanView === 'list' ? (
          <div className={s.styles.cardFlush} data-testid="st-channels">
            <div className={cx(s.styles.th, styles.lGrid, styles.lTh)}>
              <span>{t('col.channel')}</span>
              <span>{t('col.status')}</span>
              <span className={styles.right}>{t('col.convs')}</span>
              <span className={styles.right}>{t('col.frt')}</span>
              <span>{t('col.agent')}</span>
              <span />
            </div>
            {rows.map((c) => (
              <ListRow key={c.type} c={c} />
            ))}
          </div>
        ) : (
          <div className={styles.groups} data-testid="st-channels">
            {GROUPS.map((g) => {
              const items = rows.filter((c) => c.group === g);
              return items.length ? (
                <div key={g}>
                  <div className={styles.gT}>{t(`group.${g}`)}</div>
                  <div className={styles.grid}>
                    {items.map((c) => (
                      <ChannelCard key={c.type} c={c} />
                    ))}
                  </div>
                </div>
              ) : null;
            })}
          </div>
        )}
      </PageStates>
      <ConnectChannelModal />
      <ManageChannelDrawer />
    </>
  );
}
