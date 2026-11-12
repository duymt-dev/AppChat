// Lưới ánh xạ trường → cột tệp (TIP-038b P4): trường lấy từ registry `@appchat/shared` (không tự đặt), cột từ kế hoạch; đổi một ô →
// transfer.update_mapping (version mới, kiểm lại mọi dòng). Trường bắt buộc có dấu *. Một cột chỉ gán một trường. Cột có ghi chú hợp đồng
// (TIP-027b: mô tả chữ thuần không giữ định dạng / JSON định dạng) hiện chú thích dưới nhãn.
'use client';
import { useTranslations } from 'next-intl';
import { transferSpec } from '@appchat/shared';
import { useTransferStyles } from '../styles/transfer.styles';
import type { TransferPlanDto } from '../types';

export interface MappingEditorProps {
  plan: TransferPlanDto;
  disabled: boolean;
  onChange: (field: string, column: string) => void;
}

export function MappingEditor({ plan, disabled, onChange }: MappingEditorProps) {
  const t = useTranslations('data-transfer');
  const { styles: s } = useTransferStyles();
  const fields = transferSpec(plan.entity).fields;
  return (
    <div className={s.map} data-testid="dt-mapping">
      {fields.map((f) => (
        <label key={f.key} className={s.field}>
          <span className={s.label}>
            {t(`field.${f.key}` as never)}
            {f.required ? <span className={s.req}>{t('requiredMark')}</span> : null}
          </span>
          <select className={s.input} value={plan.mapping[f.key] ?? ''} disabled={disabled} data-field={f.key} onChange={(e) => onChange(f.key, e.target.value)}>
            <option value="">{t('skipField')}</option>
            {plan.columns.map((c, i) => (
              <option key={`${c}-${i}`} value={c}>
                {c}
              </option>
            ))}
          </select>
          {f.hint ? <span className={s.note}>{t(`hint.${f.hint}`)}</span> : null}
        </label>
      ))}
    </div>
  );
}
