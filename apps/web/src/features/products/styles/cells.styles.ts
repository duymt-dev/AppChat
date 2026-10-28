// Ô bảng / thẻ kanban / thẻ mobile Sản phẩm — prototype L5658–5689.
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

export const useProductCellStyles = createStyles(({ css }) => ({
  code: css`
    font-size: ${font.scale.s12}px;
    font-family: ${font.mono};
    color: ${color.text3};
  `,
  name: css`
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    cursor: pointer;
  `,
  icon: css`
    width: 38px;
    height: 38px;
    border-radius: ${radius.r10}px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  nameText: css`
    min-width: 0;
  `,
  title: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  desc: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  cat: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text3};
    background: ${color.pillBg};
    border-radius: ${radius.r6}px;
    padding: 2px 8px;
    white-space: nowrap;
  `,
  price: css`
    display: block;
    text-align: right;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandDeep};
  `,
  cost: css`
    display: block;
    text-align: right;
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
  `,
  muted: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
  `,
  sold: css`
    display: block;
    text-align: right;
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
  `,
  end: css`
    display: block;
    text-align: right;
  `,
  tags: css`
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  `,
  chan: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text2};
    background: ${color.dividerSoft};
    border-radius: ${radius.r4}px;
    padding: 2px 6px;
  `,
  attr: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.semibold};
    color: ${color.violet};
    background: ${color.violetChip};
    border-radius: ${radius.r4}px;
    padding: 2px 6px;
  `,
  status: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    padding: 2px 8px;
    border-radius: ${radius.r10}px;
    white-space: nowrap;
  `,
  kCard: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    padding: 12px;
    cursor: pointer;
    &:hover {
      background: ${color.rowHover};
    }
  `,
  kName: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    margin-bottom: 6px;
  `,
  kFoot: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
  `,
  kPrice: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    color: ${color.brandDeep};
  `,
  kSold: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
  `,
  mCard: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  mRow: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  `,
}));
