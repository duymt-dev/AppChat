// Nút xuất liệu trình của khách (TIP-033b §5.1): CSV / XLSX qua `package.export` (khung xuất chung — tệp thật tải có hạn, tiến độ thật khi
// chạy nền). Chỉ hiện khi có crm.export. Tập chỉ xuất: không có nút nhập số buổi.
'use client';
import { useTranslations } from 'next-intl';
import { createStyles } from 'antd-style';
import { color, font } from '@appchat/ui';
import { useCan } from '../../authz/useCan';
import { useListExport } from '../../actions/useListExport';
import { LIST_EXPORT_FORMATS } from '@appchat/shared';

const useStyles = createStyles(({ css }) => ({
  row: css`
    display: flex;
    gap: 12px;
    margin-top: 8px;
  `,
  btn: css`
    border: none;
    background: none;
    padding: 0;
    font: inherit;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.brandInk};
    cursor: pointer;
    &:disabled {
      color: ${color.text4};
      cursor: default;
    }
  `,
}));

export function PackagesExport({ contactId }: { contactId: string }) {
  const t = useTranslations('common.packages');
  const can = useCan('crm.export');
  const x = useListExport('package.export');
  const { styles } = useStyles();
  if (!can) return null;
  return (
    <div className={styles.row}>
      {LIST_EXPORT_FORMATS.map((f) => (
        <button key={f} type="button" className={styles.btn} disabled={x.busy} onClick={() => void x.start({ contact_id: contactId, format: f })} data-testid={`pk-export-${f}`}>
          {x.label ?? t(`export_${f}`)}
        </button>
      ))}
    </div>
  );
}
