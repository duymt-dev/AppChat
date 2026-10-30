// AiButton (Blueprint §7.1, REQ-N15): nút "Trợ lý AI" một kiểu toàn app — nền mực, ✦ xanh brand, tooltip tên module.
// Thay mọi biến thể cục bộ (`.aibtn` của prototype). Ẩn ở màn OUT theo D07/D19 — do màn gọi quyết định hiện/ẩn, không phải primitive.
'use client';
import type { ReactNode } from 'react';
import { createStyles } from 'antd-style';
import { Icon } from '../icons';
import { color, font, layout, radius, shadow } from '../tokens';

export interface AiButtonProps {
  /** Nhãn hiển thị (i18n `common.assistant` — mặc định "Trợ lý AI"). */
  label: string;
  /** Tên module hiện trong tooltip, ví dụ "Trợ lý AI · Đề nghị thanh toán". */
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
    background: ${color.text};
    color: ${color.white};
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    font-family: inherit;
    border: none;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    box-shadow: ${shadow.cardSoft};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
}));

export function AiButton({ label, module, onClick, testId = 'ai-button', icon }: AiButtonProps) {
  const { styles } = useStyles();
  const title = module ? `${label} · ${module}` : label;
  return (
    <button type="button" className={styles.btn} title={title} onClick={onClick} data-testid={testId}>
      {icon ?? <Icon name="ic-spark" size={15} color={color.brand} strokeWidth={1.9} />}
      {label}
    </button>
  );
}
