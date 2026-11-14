// Cửa sổ luồng tin sau khi nhảy tới kết quả tìm (TIP-025b §B.3): dải dính đầu "Đang xem tin cũ · Về tin mới nhất", nút tải tin mới hơn,
// tô tin đích. Prototype không có (loại M — D21): dựng bằng token.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useThreadStyles = createStyles(({ css, responsive }) => ({
  jumpBar: css`
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin: 0 0 8px;
    padding: 6px 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    background: ${color.surface};
    font-size: ${font.scale.s12}px;
    color: ${color.text2};
  `,
  jumpBtn: css`
    border: none;
    background: none;
    padding: 0;
    color: ${color.brand};
    font-weight: ${font.weight.semibold};
    font-size: ${font.scale.s12}px;
    font-family: inherit;
    cursor: pointer;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  more: css`
    display: block;
    margin: 8px auto;
    padding: 4px 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    background: ${color.surface};
    color: ${color.text2};
    font-size: ${font.scale.s12}px;
    font-family: inherit;
    cursor: pointer;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
}));
