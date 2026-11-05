// Hộp "Gửi báo giá" (TIP-032b P2 — màn mới, prototype không có): hai hàng lựa chọn kênh / định dạng dạng nút phân đoạn như bộ chuyển
// Danh sách / Kanban (prototype L4996 `.seg`), ghi chú nhỏ dưới mỗi hàng.
import { createStyles } from 'antd-style';
import { color, font, layout, radius, shadow } from '@appchat/ui';

export const useDeliveryStyles = createStyles(({ css, responsive }) => ({
  group: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  `,
  seg: css`
    display: flex;
    flex-wrap: wrap;
    padding: 2px;
    background: ${color.divider};
    border-radius: ${radius.r8}px;
    gap: 2px;
  `,
  opt: css`
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 34px;
    padding: 0 12px;
    border: none;
    border-radius: ${radius.r8}px;
    background: transparent;
    color: ${color.text3};
    font-family: inherit;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  on: css`
    background: ${color.surface};
    color: ${color.text};
    box-shadow: ${shadow.segOn};
  `,
  note: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
}));
