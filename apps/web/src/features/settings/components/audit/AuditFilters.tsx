// Thanh lọc Audit (TIP-045b A2): hành động (tất cả / chỉ sự kiện bảo mật / một loại), trạng thái, từ ngày – đến ngày, xoá lọc.
'use client';
import { useTranslations } from 'next-intl';
import { AUDIT_STATUSES } from '@appchat/shared';
import { useSectionStyles } from '../../styles/section.styles';
import type { AuditFilterDraft } from '../../hooks/useAuditFilters';

interface Props {
  draft: AuditFilterDraft;
  active: boolean;
  set: (p: Partial<AuditFilterDraft>) => void;
  reset: () => void;
  /** Lựa chọn hành động riêng của từng bảng (audit: security; AI: không). */
  actions?: string[];
}

/** Id action có dấu chấm → key i18n (next-intl không cho "." trong key — dùng "__"). */
const i18nKey = (id: string) => id.replace(/\./g, '__');

export function AuditFilters({ draft, active, set, reset, actions = [] }: Props) {
  const t = useTranslations('settings.audit.filter');
  const s = useSectionStyles().styles;
  return (
    <div className={s.row} data-testid="st-audit-filters">
      {actions.length ? (
        <select className={s.select} value={draft.action} onChange={(e) => set({ action: e.target.value })} aria-label={t('action')} data-testid="st-audit-action">
          <option value="">{t('allActions')}</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {t(`act.${i18nKey(a)}` as never)}
            </option>
          ))}
        </select>
      ) : null}
      <select className={s.select} value={draft.status} onChange={(e) => set({ status: e.target.value as AuditFilterDraft['status'] })} aria-label={t('status')} data-testid="st-audit-status">
        <option value="">{t('allStatus')}</option>
        {AUDIT_STATUSES.map((x) => (
          <option key={x} value={x}>
            {t(`st.${x}`)}
          </option>
        ))}
      </select>
      <input className={s.input} type="date" value={draft.from} onChange={(e) => set({ from: e.target.value })} aria-label={t('from')} data-testid="st-audit-from" />
      <input className={s.input} type="date" value={draft.to} onChange={(e) => set({ to: e.target.value })} aria-label={t('to')} data-testid="st-audit-to" />
      {active ? (
        <button type="button" className={s.ghost} onClick={reset} data-testid="st-audit-reset">
          {t('reset')}
        </button>
      ) : null}
    </div>
  );
}
