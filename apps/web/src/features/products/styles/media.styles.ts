// Tab Tệp của drawer sản phẩm (TIP-027b) — prototype L6073–6084: thẻ trắng, dòng tệp (ô đuôi màu 34×40 · tên · meta · "Mở"), nút "+ Tải
// tệp lên" viền đứt (dùng chung useRecordFilesStyles). Thêm: lưới ảnh có ảnh chính, nút sắp xếp / đặt ảnh chính / gỡ. Mobile: chạm ≥ 44.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useMediaStyles = createStyles(({ css, responsive }) => ({
  grid: css`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    padding: 8px 16px;
    border-top: 1px solid ${color.divider};
    ${responsive.mobile} {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  `,
  tile: css`
    position: relative;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    overflow: hidden;
    background: ${color.rowHover};
  `,
  primaryTile: css`
    border-color: ${color.brand};
  `,
  thumb: css`
    display: block;
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    background: ${color.pillBg};
  `,
  badge: css`
    position: absolute;
    top: 4px;
    left: 4px;
    padding: 0 6px;
    border-radius: ${radius.pill}px;
    background: ${color.brand};
    color: ${color.white};
    font-size: ${font.scale.s10}px;
    font-weight: ${font.weight.heavy};
    line-height: 18px;
  `,
  tileBar: css`
    display: flex;
    justify-content: space-between;
    gap: 2px;
    padding: 2px;
    ${responsive.mobile} {
      flex-wrap: wrap;
    }
  `,
  icon: css`
    flex: 1;
    min-width: 0;
    height: 24px;
    border: none;
    border-radius: ${radius.r4}px;
    background: transparent;
    color: ${color.text2};
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    font-family: inherit;
    &:disabled {
      color: ${color.text4};
      cursor: not-allowed;
    }
    &:focus-visible {
      outline: 2px solid ${color.brand};
    }
    ${responsive.mobile} {
      flex: 1 0 ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  name: css`
    padding: 0 6px 4px;
    font-size: ${font.scale.s11}px;
    color: ${color.text3};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  sub: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    color: ${color.text4};
    padding: 8px 16px 2px;
  `,
  retry: css`
    margin-left: 6px;
    border: none;
    background: transparent;
    color: ${color.brandInk};
    font-weight: ${font.weight.bold};
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
    padding: 0;
  `,
}));
