// Chọn loại hợp đồng của mẫu (TIP-030b spec 8): chỉ hiện với mẫu hợp đồng; "Mọi loại" = mẫu chung (mặc định chung), còn lại là mẫu
// mặc định riêng của loại Dịch vụ / Mua bán / Nguyên tắc. Mẫu đang là mặc định không đổi được loại (server từ chối `default_locked`).
'use client';
import { useTranslations } from 'next-intl';
import { useSectionStyles } from '../styles/section.styles';
import type { DocTemplate } from '../types';

export type ContractKindValue = DocTemplate['contract_kind'];
const KINDS = ['service', 'sale', 'framework'] as const;

export function ContractKindSelect({ value, onChange, locked, testId }: { value: ContractKindValue; onChange: (v: ContractKindValue) => void; locked?: boolean; testId: string }) {
  const t = useTranslations('settings.doctpl.contractKind');
  const s = useSectionStyles().styles;
  return (
    <div>
      <div className={s.label}>{t('label')}</div>
      <select className={s.select} value={value ?? ''} disabled={locked} onChange={(e) => onChange((e.target.value || null) as ContractKindValue)} data-testid={testId} title={locked ? t('locked') : undefined}>
        <option value="">{t('any')}</option>
        {KINDS.map((k) => (
          <option key={k} value={k}>
            {t(k)}
          </option>
        ))}
      </select>
    </div>
  );
}
