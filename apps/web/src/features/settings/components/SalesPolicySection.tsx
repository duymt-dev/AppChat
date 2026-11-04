// Mục Chính sách bán hàng (TIP-032b P1, COMMERCE §3 Q5 "ngưỡng duyệt cấu hình được"): ngưỡng tổng giá trị (VND) và % giảm giá mà báo giá
// vượt phải được Owner / Quản lý duyệt trước khi gửi. Chỉ Chủ sở hữu sửa (`can_edit` từ server); người khác xem chỉ đọc. Trần giảm giá cho
// báo giá do AI / tác vụ tạo lấy từ AI Governance — hiển thị để biết, không sửa ở đây. Màn mới không có trong prototype (gap-filling §2).
'use client';
import { useTranslations } from 'next-intl';
import { useFmt } from '@/shared/i18n/useFmt';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useSectionStyles } from '../styles/section.styles';
import { useSalesPolicyStyles } from '../styles/sales-policy.styles';
import { useSalesPolicy } from '../hooks/useSalesPolicy';

export function SalesPolicySection() {
  const t = useTranslations('settings.salesPolicy');
  const fmt = useFmt();
  const s = useSectionStyles().styles;
  const { styles } = useSalesPolicyStyles();
  const f = useSalesPolicy();
  const p = f.q.data;
  const ro = !p?.can_edit;
  return (
    <PageStates state={stateOf(f.q)} onRetry={() => void f.q.refetch()}>
      {p ? (
        <div className={styles.box} data-testid="st-sales-policy">
          <div className={styles.two}>
            <div>
              <div className={s.label}>{t('total')}</div>
              <input
                className={s.input}
                inputMode="numeric"
                value={f.draft.total}
                disabled={ro}
                onChange={(e) => f.setTotal(e.target.value)}
                aria-label={t('total')}
                data-testid="st-sp-total"
              />
              <div className={styles.hint}>{f.draft.total ? fmt.money(f.draft.total) : t('required')}</div>
            </div>
            <div>
              <div className={s.label}>{t('pct')}</div>
              <input
                className={s.input}
                inputMode="numeric"
                value={f.draft.pct}
                disabled={ro}
                onChange={(e) => f.setPct(e.target.value)}
                aria-label={t('pct')}
                data-testid="st-sp-pct"
              />
              <div className={styles.hint}>{f.valid ? t('pctHint') : t('pctInvalid')}</div>
            </div>
          </div>
          <div className={styles.note} data-testid="st-sp-agent">
            {t('agentCap', { pct: p.agent_max_discount_pct })}
          </div>
          {ro ? (
            <div className={s.muted} data-testid="st-sp-readonly">
              {t('ownerOnly')}
            </div>
          ) : (
            <div className={styles.foot}>
              <button type="button" className={s.ghost} disabled={!f.dirty || f.saving} onClick={f.reset} data-testid="st-sp-reset">
                {t('reset')}
              </button>
              <button type="button" className={s.primary} disabled={!f.dirty || !f.valid || f.saving} onClick={() => void f.submit()} data-testid="st-sp-save">
                {t('save')}
              </button>
            </div>
          )}
        </div>
      ) : null}
    </PageStates>
  );
}
