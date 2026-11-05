// Ô chọn kênh gửi chứng từ cho khách (TIP-032b P2): Zalo cá nhân · Email · Website chat — dùng ở đề nghị thanh toán, xác nhận đơn, phiếu
// thu (báo giá dùng QuoteDeliveryModal vì có thêm định dạng). Chữ qua i18n `common.docChannel`; chỉ token, không px rời.
'use client';
import { createStyles } from 'antd-style';
import { useTranslations } from 'next-intl';
import { color, font, layout, radius } from '@appchat/ui';

export const DOC_CHANNELS = ['zalo_personal', 'email', 'webchat'] as const;
export type DocChannel = (typeof DOC_CHANNELS)[number];

const useStyles = createStyles(({ css, responsive }) => ({
  sel: css`
    height: 40px;
    padding: 0 8px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    background: ${color.surface};
    color: ${color.text};
    font-family: inherit;
    font-size: ${font.scale.s13}px;
    cursor: pointer;
    &:disabled {
      color: ${color.text4};
      cursor: not-allowed;
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
}));

export function ChannelSelect({ value, onChange, disabled, testId }: { value: DocChannel; onChange: (c: DocChannel) => void; disabled?: boolean; testId?: string }) {
  const t = useTranslations('common.docChannel');
  const { styles } = useStyles();
  return (
    <select className={styles.sel} value={value} disabled={disabled} aria-label={t('label')} onChange={(e) => onChange(e.target.value as DocChannel)} data-testid={testId}>
      {DOC_CHANNELS.map((c) => (
        <option key={c} value={c}>
          {t(c)}
        </option>
      ))}
    </select>
  );
}
