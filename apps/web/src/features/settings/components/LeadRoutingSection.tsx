// Mục Chia lead (TIP-042b, crm.reassign; prototype "Routing & assignment" L7357–7363 — chỉ phần P1: chiến lược chia, PD-019). Một hàng rule
// mặc định + một hàng mỗi tài khoản kênh (ghi đè hoặc "theo mặc định"); nhãn trạng thái + nút Sửa mở trình sửa. Ghi chú "chỉ lead mới"
// (DC-238 — không chia lại khách cũ, không đổi chủ đã có). Không có skill / online / AFK / ngôn ngữ / sticky (P3 OUT).
'use client';
import { useTranslations } from 'next-intl';
import type { LeadRoutingDto, LeadRoutingRuleDto } from '@appchat/shared';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useSectionStyles } from '../styles/section.styles';
import { useRoutingStyles } from '../styles/routing.styles';
import { useSettingsUi } from '../settings-store';
import { useLeadRouting } from '../hooks/useLeadRouting';
import { draftOfRule } from '../routing.types';
import { LeadRoutingEditor } from './LeadRoutingEditor';

function RuleRow({ label, desc, rule, accountId, inherit, legacy }: { label: string; desc: string; rule?: LeadRoutingRuleDto; accountId: string | null; inherit?: boolean; legacy?: string | null }) {
  const t = useTranslations('settings.routing');
  const s = useSectionStyles().styles;
  const { styles, cx } = useRoutingStyles();
  const set = useSettingsUi((x) => x.set);
  const on = !!rule?.enabled && rule.mode !== 'manual';
  const status = rule ? (rule.enabled ? t(`mode.${rule.mode}`) : t('off')) : inherit ? t('inherit') : t('off');
  return (
    <div className={styles.row} data-rule={accountId ?? 'default'}>
      <div className={styles.body}>
        <div className={styles.lbl}>{label}</div>
        <div className={styles.desc}>{desc}</div>
      </div>
      {legacy === 'shift' && !rule ? <span className={cx(styles.pill, styles.legacy)}>{t('legacyShift')}</span> : null}
      <span className={cx(styles.pill, on && styles.on)} data-testid="st-rt-status">
        {status}
      </span>
      <button type="button" className={s.ghost} onClick={() => set({ routingEditor: draftOfRule(accountId, rule) })} data-testid="st-rt-edit">
        {t('edit')}
      </button>
    </div>
  );
}

function Rules({ data }: { data: LeadRoutingDto }) {
  const t = useTranslations('settings.routing');
  const { styles } = useRoutingStyles();
  const def = data.rules.find((r) => r.channel_account_id === null);
  return (
    <>
      <div className={styles.title}>{t('title')}</div>
      <div className={styles.sub}>{t('sub')}</div>
      <div className={styles.note} data-testid="st-rt-note">
        {t('newOnly')}
      </div>
      <div className={styles.box} data-testid="st-rt-default">
        <RuleRow label={t('default')} desc={t('defaultD')} rule={def} accountId={null} />
      </div>
      <div className={styles.title}>{t('accounts')}</div>
      <div className={styles.sub}>{t('accountsD')}</div>
      <div className={styles.box} data-testid="st-rt-accounts">
        {data.candidates.accounts.length ? (
          data.candidates.accounts.map((a) => (
            <RuleRow
              key={a.id}
              label={a.name}
              desc={t('accountD', { type: a.type })}
              rule={data.rules.find((r) => r.channel_account_id === a.id)}
              accountId={a.id}
              inherit
              legacy={a.legacy_assign_mode}
            />
          ))
        ) : (
          <div className={styles.row}>
            <div className={styles.desc}>{t('noAccounts')}</div>
          </div>
        )}
      </div>
    </>
  );
}

export function LeadRoutingSection() {
  const { q } = useLeadRouting();
  return (
    <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
      {q.data ? <Rules data={q.data} /> : null}
      <LeadRoutingEditor />
    </PageStates>
  );
}
