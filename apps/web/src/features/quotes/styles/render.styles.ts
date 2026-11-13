// Dải trạng thái PDF báo giá đã gửi (TIP-028b): đang tạo (nền vàng nhạt) / lỗi (nền đỏ nhạt + nút Thử lại). Token prototype, không hard-code.
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

export const useRenderStyles = createStyles(({ css }) => ({
  bar: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    padding: 8px 12px;
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
  `,
  pending: css`
    background: ${color.amberBg};
    color: ${color.amberText};
  `,
  failed: css`
    background: ${color.dangerBg};
    color: ${color.dangerStrong};
  `,
  grow: css`
    flex: 1;
  `,
  retry: css`
    border: 1px solid ${color.border};
    background: ${color.surface};
    border-radius: ${radius.r8}px;
    height: 28px;
    padding: 0 12px;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    cursor: pointer;
    font-family: inherit;
    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  `,
}));
