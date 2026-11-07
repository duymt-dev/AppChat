// Trình sửa rule chia lead (TIP-042b): bật / tắt, chiến lược (thủ công · xoay vòng · ít việc nhất · theo kênh — chỉ ở rule tài khoản),
// pool = danh sách người hoặc một nhóm (chọn một), theo kênh = một người cố định. Lưu qua lead_routing.update (preview ở Trợ lý; ở màn
// này lưu thẳng — risk config). Ghi chú "chỉ lead mới" + "lịch sử nhập sau khi bật cũng tính là lead mới" (DC-238).
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { LEAD_ROUTING_MODES, type LeadRoutingMode } from '@appchat/shared';
import { useSectionStyles } from '../styles/section.styles';
import { useRoutingStyles } from '../styles/routing.styles';
import { useLeadRouting } from '../hooks/useLeadRouting';
import { leadRoutingQuery } from '../api/lead-routing';
import type { RoutingDraft } from '../routing.types';
import { FormModal } from './FormModal';
import { Switch } from './Switch';

const POOLS: RoutingDraft['pool'][] = ['users', 'team'];

export function LeadRoutingEditor() {
  const t = useTranslations('settings.routing');
  const s = useSectionStyles().styles;
  const { styles } = useRoutingStyles();
  const { d, patch, close, submit, pending } = useLeadRouting();
  const c = useQuery({ ...leadRoutingQuery(), enabled: !!d }).data?.candidates;
  if (!d || !c) return null;
  const modes = LEAD_ROUTING_MODES.filter((m) => m !== 'by_channel' || d.accountId);
  const account = d.accountId ? c.accounts.find((a) => a.id === d.accountId) : null;
  const toggle = (id: string) => patch({ userIds: d.userIds.includes(id) ? d.userIds.filter((x) => x !== id) : [...d.userIds, id] });
  return (
    <FormModal
      open
      title={account ? t('editAccount', { name: account.name }) : t('editDefault')}
      onClose={close}
      onSave={() => void submit()}
      saveLabel={t('save')}
      cancelLabel={t('cancel')}
      closeLabel={t('close')}
      pending={pending}
      testId="st-rt-editor"
    >
      <div className={styles.toggle}>
        <div>
          <div className={styles.lbl}>{t('enabled')}</div>
          <div className={styles.desc}>{t('enabledD')}</div>
        </div>
        <Switch on={d.enabled} onChange={(v) => patch({ enabled: v })} label={t('enabled')} testId="st-rt-enabled" />
      </div>
      <div>
        <div className={s.label}>{t('strategy')}</div>
        <select className={s.select} value={d.mode} onChange={(e) => patch({ mode: e.target.value as LeadRoutingMode })} data-testid="st-rt-mode">
          {modes.map((m) => (
            <option key={m} value={m}>
              {t(`mode.${m}`)}
            </option>
          ))}
        </select>
        <div className={s.muted}>{t(`modeD.${d.mode}`)}</div>
      </div>
      {d.mode === 'round_robin' || d.mode === 'least_busy' ? (
        <div>
          <div className={s.label}>{t('pool')}</div>
          <div className={styles.seg} role="radiogroup" aria-label={t('pool')}>
            {POOLS.map((p) => (
              <label key={p} className={styles.opt}>
                <input type="radio" name="rt-pool" checked={d.pool === p} onChange={() => patch({ pool: p })} data-testid={`st-rt-pool-${p}`} />
                {t(`poolKind.${p}`)}
              </label>
            ))}
          </div>
          {d.pool === 'team' ? (
            <select className={s.select} value={d.teamId ?? ''} onChange={(e) => patch({ teamId: e.target.value || null })} data-testid="st-rt-team">
              <option value="">{t('pickTeam')}</option>
              {c.teams.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          ) : (
            <div className={styles.pick} role="group" aria-label={t('poolKind.users')} data-testid="st-rt-users">
              {c.users.map((u) => (
                <label key={u.id} className={styles.opt}>
                  <input type="checkbox" checked={d.userIds.includes(u.id)} onChange={() => toggle(u.id)} data-user={u.id} />
                  {u.name}
                </label>
              ))}
            </div>
          )}
        </div>
      ) : null}
      {d.mode === 'by_channel' ? (
        <div>
          <div className={s.label}>{t('fixed')}</div>
          <select className={s.select} value={d.fixedUserId ?? ''} onChange={(e) => patch({ fixedUserId: e.target.value || null })} data-testid="st-rt-fixed">
            <option value="">{t('pickUser')}</option>
            {c.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className={styles.note}>{d.accountId && d.mode === 'manual' ? t('overrideManual') : t('history')}</div>
    </FormModal>
  );
}
