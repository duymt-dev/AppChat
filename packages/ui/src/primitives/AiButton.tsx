// AiButton (Blueprint §7 primitive, REQ-N15): nút "Trợ lý AI" MỘT KIỂU toàn app — nền mực, ✦ xanh brand, chữ "Trợ lý AI" cố định,
// tên module chỉ ở tooltip. Thay mọi biến thể cục bộ (prototype `.aibtn`, CSS global L392).
'use client';
import { createStyles } from 'antd-style';
import { Icon } from '../icons';
import { color, font, layout, radius } from '../tokens';

export interface AiButtonProps {
  /** Chữ cố định "Trợ lý AI" / "AI Assistant" theo locale — truyền từ `t('common.aiButton')` của caller. */
  label: string;
  /** Tên module hiện trong tooltip, vd "Báo giá" (invoices dùng "Đề nghị thanh toán", không phải "Hóa đơn" — luật COMMERCE D46). */
  module?: string;
  onClick: () => void;
  testId?: string;
}

const useStyles = createStyles(({ css, responsive }) => ({
  btn: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 12px;
    border-radius: ${radius.r8}px;
    border: none;
    background: ${color.text};
    color: ${color.white};
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    flex-shrink: 0;
    font-family: inherit;
    &:hover {
      background: ${color.forest};
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
}));

export function AiButton({ label, module, onClick, testId }: AiButtonProps) {
  const { styles } = useStyles();
  const title = module ? `${label} · ${module}` : label;
  return (
    <button type="button" className={styles.btn} onClick={onClick} title={title} data-testid={testId}>
      <Icon name="ic-spark" size={15} color={color.brand} />
      {label}
    </button>
  );
}
