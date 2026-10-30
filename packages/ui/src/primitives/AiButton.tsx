// AiButton (Blueprint §7.1, REQ-N15): nút "Trợ lý AI" MỘT KIỂU toàn app — nền mực, ✦ xanh brand, chữ "Trợ lý AI" cố định,
// tên module chỉ ở tooltip. Thay mọi biến thể cục bộ (prototype `.aibtn`, CSS global L392). Ẩn ở màn OUT (D07/D19) do màn gọi quyết định.
'use client';
import type { ReactNode } from 'react';
import { createStyles } from 'antd-style';
import { Icon } from '../icons';
import { color, font, layout, radius, shadow } from '../tokens';

export interface AiButtonProps {
  /** Chữ cố định "Trợ lý AI" / "AI Assistant" theo locale — truyền từ `t('common.aiButton')` của caller. */
  label: string;
  /** Tên module hiện trong tooltip, vd "Báo giá" (invoices dùng "Đề nghị thanh toán", không phải "Hóa đơn" — luật COMMERCE D46). */
  module?: string;
  onClick: () => void;
  testId?: string;
  icon?: ReactNode;
}

const useStyles = createStyles(({ css, responsive }) => ({
  btn: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 36px;
    padding: 0 12px;
    border-radius: ${radius.r8}px;
    border: none;
    background: ${color.text};
    color: ${color.white};
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    box-shadow: ${shadow.cardSoft};
    &:hover {
      background: ${color.forest};
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
}));

export function AiButton({ label, module, onClick, testId = 'ai-button', icon }: AiButtonProps) {
  const { styles } = useStyles();
  const title = module ? `${label} · ${module}` : label;
  return (
    <button type="button" className={styles.btn} onClick={onClick} title={title} data-testid={testId}>
      {icon ?? <Icon name="ic-spark" size={15} color={color.brand} strokeWidth={1.9} />}
      {label}
    </button>
  );
}
