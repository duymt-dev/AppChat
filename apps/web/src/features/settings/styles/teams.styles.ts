// Mục Nhóm (TIP-042) — prototype L6709–6745 (thẻ phòng ban, chỉ phần nhóm phẳng): thanh công cụ (tìm 240 + Tạo), lưới 4 cột gap 16, thẻ
// bo 16 pad 16: ô màu 46 bo 12 + tên 18 đậm + "N thành viên", hàng avatar 28 chồng −8, hai nút 40 "Thành viên" / "Cấu hình".
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

const chip = `
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 40px;
  border: 1px solid ${color.border};
  border-radius: ${radius.r10}px;
  background: ${color.surface};
  font-size: ${font.scale.s14}px;
  font-weight: ${font.weight.semibold};
  font-family: inherit;
  color: ${color.text};
  cursor: pointer;
`;

export const useTeamsStyles = createStyles(({ css, responsive }) => ({
  /** Prototype: hàng tìm (40) rồi nút "Tạo" (36) xuống dòng — cột, cách 8, dưới 12. */
  tools: css`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 12px;
    ${responsive.md} {
      align-items: stretch;
    }
  `,
  search: css`
    && {
      flex: none;
      width: 240px;
      input {
        height: 40px;
      }
      ${responsive.md} {
        width: auto;
      }
    }
  `,
  newBtn: css`
    && {
      height: 36px;
    }
  `,
  grid: css`
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  card: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r16}px;
    padding: 16px;
  `,
  head: css`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
  `,
  ic: css`
    width: 46px;
    height: 46px;
    border-radius: ${radius.r12}px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  info: css`
    flex: 1;
    min-width: 0;
    padding-top: 2px;
  `,
  name: css`
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    overflow-wrap: anywhere;
  `,
  cnt: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text4};
    margin-top: 2px;
  `,
  dots: css`
    width: 28px;
    height: 28px;
    border: none;
    border-radius: ${radius.r6}px;
    background: transparent;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    cursor: pointer;
    &:hover {
      background: ${color.tabIdle};
    }
  `,
  avs: css`
    display: flex;
    align-items: center;
    min-height: 28px;
    margin-bottom: 16px;
  `,
  av: css`
    width: 28px;
    height: 28px;
    border-radius: 50%;
    color: ${color.white};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.heavy};
    border: 2px solid ${color.surface};
    margin-right: -8px;
  `,
  more: css`
    background: ${color.border};
    color: ${color.text3};
    font-size: ${font.scale.s12}px;
  `,
  lead: css`
    flex: 1;
    min-width: 0;
    margin-left: 16px;
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  btns: css`
    display: flex;
    gap: 8px;
  `,
  chip: css`
    ${chip}
    &:hover {
      background: ${color.tabIdle};
    }
  `,
  empty: css`
    padding: 40px 16px;
    text-align: center;
    background: ${color.surface};
    border: 1px dashed ${color.border};
    border-radius: ${radius.r16}px;
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
  `,
  pick: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 280px;
    overflow-y: auto;
  `,
  opt: css`
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    cursor: pointer;
    input {
      width: 18px;
      height: 18px;
      accent-color: ${color.brand};
      cursor: inherit;
    }
  `,
  optOff: css`
    color: ${color.text4};
    cursor: not-allowed;
  `,
}));
