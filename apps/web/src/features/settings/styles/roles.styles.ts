// Mục Vai trò — prototype L5998–6027: danh sách vai trò (thanh màu 4×38, tên 16 đậm 230px, mô tả, số người 70px, nhãn viền),
// ma trận 1.6fr + 5 cột, hàng nhóm nền xám chữ hoa 12, ✓ xanh / — xám.
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

export const useRolesStyles = createStyles(({ css, responsive }) => ({
  tools: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  `,
  list: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    overflow: hidden;
    margin-bottom: 24px;
  `,
  role: css`
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 16px 16px 0;
    border-bottom: 1px solid ${color.divider};
    &:last-of-type {
      border-bottom: none;
    }
    ${responsive.md} {
      flex-wrap: wrap;
      gap: 8px;
      padding: 12px 12px 12px 0;
    }
  `,
  bar: css`
    width: 4px;
    height: 38px;
    border-radius: 0 3px 3px 0;
    flex-shrink: 0;
  `,
  nameCol: css`
    width: 230px;
    flex-shrink: 0;
    display: flex;
    align-items: baseline;
    gap: 8px;
    ${responsive.md} {
      width: auto;
      flex: 1;
    }
  `,
  name: css`
    font-size: ${font.scale.s16}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  sys: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    font-weight: ${font.weight.medium};
  `,
  desc: css`
    flex: 1;
    min-width: 0;
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
    ${responsive.md} {
      flex: 1 1 100%;
      padding-left: 12px;
    }
  `,
  cnt: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
    width: 70px;
    flex-shrink: 0;
    ${responsive.md} {
      padding-left: 12px;
    }
  `,
  tag: css`
    display: inline-flex;
    align-items: center;
    padding: 4px 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text2};
    flex-shrink: 0;
  `,
  lock: css`
    width: 30px;
    height: 30px;
    border-radius: ${radius.r6}px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    margin-right: 12px;
  `,
  mHead: css`
    margin-bottom: 12px;
  `,
  mT: css`
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  mS: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text4};
    margin-top: 2px;
  `,
  scroll: css`
    ${responsive.md} {
      overflow-x: auto;
      > div {
        min-width: 640px;
      }
    }
  `,
  mRow: css`
    display: grid;
    grid-template-columns: 1.6fr repeat(5, 1fr);
    padding: 12px 16px;
    border-bottom: 1px solid ${color.divider};
    align-items: center;
  `,
  mTh: css`
    background: ${color.tabIdle};
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    letter-spacing: 0.04em;
    color: ${color.text4};
  `,
  c: css`
    text-align: center;
    display: flex;
    justify-content: center;
  `,
  group: css`
    padding: 8px 16px;
    background: ${color.tabIdle};
    border-bottom: 1px solid ${color.divider};
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    letter-spacing: 0.05em;
    color: ${color.text4};
    text-transform: uppercase;
  `,
  pName: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
  `,
  no: css`
    color: ${color.lySwitchOff};
    font-size: ${font.scale.s15}px;
  `,
}));
