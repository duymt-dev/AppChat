// Thẻ đề xuất chỉ đọc (TIP-023g §3.2–3.3): combo (sản phẩm hiện hành + số lượng + giá danh mục) / chiến dịch (nội dung + tiêu chí bằng
// lời). Đề xuất ≠ bản ghi đã tạo: chỉ có nút "Soạn …" mở luồng xác nhận chuẩn của module (người dùng tự quyết), không tạo / gửi gì ở đây.
'use client';
import { useTranslations } from 'next-intl';
import type { RecordProposalDto } from '@appchat/shared';
import { useFmt } from '../../i18n/useFmt';
import { useRecordIntentStyles } from './record-intent.styles';

export function RecordIntentCard({
  value,
  onApply,
}: {
  value: RecordProposalDto;
  onApply?: (v: RecordProposalDto) => void;
}) {
  const t = useTranslations('common.recordAi');
  const fmt = useFmt();
  const { styles } = useRecordIntentStyles();
  if (value.state !== 'validated') {
    return (
      <div className={styles.card} data-testid="rai-proposal" data-state={value.state}>
        {t(`state.${value.state}`)}
      </div>
    );
  }
  return (
    <div className={styles.card} data-testid="rai-proposal" data-state="validated">
      <span className={styles.muted}>{t('proposalLead')}</span>
      {value.combo ? (
        <>
          <b>{value.combo.name}</b>
          <span>{value.combo.rationale}</span>
          <ul data-testid="rai-combo-items">
            {value.combo.items.map((it) => (
              <li key={it.product_id}>
                {t('comboItem', { qty: it.qty, name: it.name, price: it.price ? fmt.money(it.price) : '—' })}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {value.campaign ? (
        <>
          <b>{value.campaign.title}</b>
          <span>{value.campaign.content}</span>
          <span className={styles.muted}>
            {t('audience', { criteria: value.campaign.audience_criteria })}
          </span>
        </>
      ) : null}
      {onApply ? (
        <div className={styles.row}>
          <button
            type="button"
            className={styles.send}
            onClick={() => onApply(value)}
            data-testid="rai-apply"
          >
            {t(value.combo ? 'applyCombo' : 'applyCampaign')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
