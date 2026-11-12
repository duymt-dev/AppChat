// Ô Danh mục của form ticket (TIP-034b §2.5): combobox chữ tự do — ô nhập giữ kiểu ô của form (form.styles), danh sách gợi ý thả xuống
// theo nhóm (Gợi ý · Đã dùng trong ticket), dòng đang chọn bằng bàn phím tô nền. Màn có sẵn: không đổi khung form (parity < 5%).
import { createStyles } from 'antd-style';
import { color, font, radius, shadow } from '@appchat/ui';

export const useCategoryStyles = createStyles(({ css }) => ({
  box: css`
    position: relative;
  `,
  pop: css`
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 40;
    max-height: 240px;
    overflow-y: auto;
    padding: 4px;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    box-shadow: ${shadow.rowMenu};
  `,
  head: css`
    padding: 6px 8px 2px;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.text4};
  `,
  opt: css`
    padding: 8px;
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s14}px;
    color: ${color.text};
    cursor: pointer;
    overflow-wrap: anywhere;
  `,
  on: css`
    background: ${color.brandBg};
  `,
  more: css`
    color: ${color.brandInk};
    font-weight: ${font.weight.bold};
  `,
  empty: css`
    padding: 8px;
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
  `,
}));
