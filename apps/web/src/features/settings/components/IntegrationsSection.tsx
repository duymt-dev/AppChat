// Mục Nền tảng kết nối (D28) — prototype L6219–6267: hero, pill nhóm, lưới thẻ 4 cột theo nhóm (cùng mẫu thẻ với Kênh kết nối).
// Chỉ connector có manifest (provider-ports.md). GA → hộp kết nối (form sinh từ manifest.auth.fields); "Sắp có" → Đăng ký quan tâm.
// Đã kết nối + có runtime (bank feed — TIP-012b P3) → drawer chi tiết (sức khoẻ, đồng bộ, nhật ký); "Quản lý" trong drawer mở hộp kết nối.
'use client';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useChannelsStyles } from '../styles/channels.styles';
import { useIntegStyles } from '../styles/integrations.styles';
import { useSettingsUi } from '../settings-store';
import { connectorsQuery } from '../api';
import type { Connector } from '../types';
import { ConnectIntegrationModal } from './ConnectIntegrationModal';
import { IntegrationDetailDrawer } from './IntegrationDetailDrawer';
import { runtimeConnectorsQuery } from '../integration-api';

const GROUPS: Connector['group'][] = ['channels_studio', 'marketing', 'crm', 'commerce', 'payments', 'productivity', 'erp'];
const ALL = 'all';

function Card({ c, connectionId }: { c: Connector; connectionId: string | null }) {
  const t = useTranslations('settings.integrations');
  const { styles, cx } = useChannelsStyles();
  const i = useIntegStyles().styles;
  const router = useRouter();
  const set = useSettingsUi((s) => s.set);
  const can = useCan('integrations.manage');
  const interest = useAction('integration.register_interest');
  const soon = c.status === 'coming_soon';
  const open = () => {
    if (c.opens) router.push(`/settings/${c.opens}`);
    else if (c.connected && connectionId) set({ integDetail: connectionId });
    else if (!soon) set({ integModal: c.key });
  };
  return (
    <div className={cx(styles.card, !soon && i.click)} style={{ background: `linear-gradient(150deg, ${c.color}12, ${color.white} 62%)` }} onClick={open} data-connector={c.key}>
      {c.connected || soon ? (
        <span className={cx(styles.badge, c.connected ? styles.b_on : i.bSoon)}>
          {c.connected ? <span className={styles.bDot} /> : null}
          {t(c.connected ? (c.opens ? 'enabled' : 'connected') : 'soonBadge')}
        </span>
      ) : null}
      <div className={styles.cHead}>
        <div className={styles.cName}>{c.name}</div>
        <span className={styles.logo} style={{ color: c.color }}>
          {c.name[0]}
        </span>
      </div>
      <div className={styles.desc}>{t(`desc.${c.key}`)}</div>
      <span className={styles.grow} />
      <div className={styles.cFoot}>
        {can ? (
          soon ? (
            <button
              type="button"
              className={styles.cBtn}
              disabled={c.interest}
              onClick={(e) => {
                e.stopPropagation();
                void interest.run({ provider: c.key });
              }}
              data-testid={`st-int-interest-${c.key}`}
            >
              {t(c.interest ? 'interested' : 'interest')}
            </button>
          ) : (
            <button type="button" className={c.connected ? styles.cBtn : i.connect} data-testid={`st-int-${c.key}`}>
              {t(c.connected ? 'setup' : 'connect')}
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}

export function IntegrationsSection() {
  const t = useTranslations('settings.integrations');
  const { styles, cx } = useIntegStyles();
  const ch = useChannelsStyles().styles;
  const ui = useSettingsUi();
  const q = useQuery(connectorsQuery());
  const rows = q.data ?? [];
  const runtime = useQuery(runtimeConnectorsQuery()).data ?? [];
  const connOf = (key: string) => runtime.find((r) => r.key === key)?.connection_id ?? null;
  const detailKey = runtime.find((r) => r.connection_id === ui.integDetail)?.key;
  return (
    <>
      <div className={styles.hero}>
        <div className={styles.heroT}>{t('heroT')}</div>
        <div className={styles.heroS}>{t('heroS')}</div>
      </div>
      <div className={styles.cats}>
        {[ALL, ...GROUPS].map((g) => (
          <button key={g} type="button" className={cx(styles.cat, ui.integCat === g && styles.catOn)} onClick={() => ui.set({ integCat: g })} data-testid={`st-int-cat-${g}`}>
            {t(`group.${g}`)}
          </button>
        ))}
      </div>
      <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
        <div className={ch.groups} data-testid="st-integrations">
          {GROUPS.filter((g) => ui.integCat === ALL || ui.integCat === g).map((g) => {
            const items = rows.filter((c) => c.group === g);
            return items.length ? (
              <div key={g}>
                <div className={ch.gT}>{t(`group.${g}`)}</div>
                <div className={ch.grid}>
                  {items.map((c) => (
                    <Card key={c.key} c={c} connectionId={connOf(c.key)} />
                  ))}
                </div>
              </div>
            ) : null;
          })}
        </div>
      </PageStates>
      <ConnectIntegrationModal />
      <IntegrationDetailDrawer connectionId={ui.integDetail} onClose={() => ui.set({ integDetail: null })} onManage={() => ui.set({ integDetail: null, integModal: detailKey ?? null })} />
    </>
  );
}
