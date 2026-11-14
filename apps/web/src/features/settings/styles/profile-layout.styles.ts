// Cài đặt → Hồ sơ 360°, danh sách mẫu — prototype L6397–6415: thẻ mô tả + "Xem như vai trò", lưới 2 cột.
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

export const useProfileLayoutStyles = createStyles(({ css, responsive }) => ({
  heroBar: css`
    display: flex;
    align-items: center;
    gap: 12px;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 16px 20px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  `,
  heroBarT: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  heroBarS: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    line-height: 1.55;
    margin-top: 2px;
  `,
  viewAs: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  viewAsLabel: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
  `,
  grid: css`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  card: css`
    border: 1.5px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  cardActive: css`
    border-color: ${color.brand};
  `,
  cardHead: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  name: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    flex: 1;
    min-width: 0;
  `,
  activeBadge: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.heavy};
    color: ${color.brandInkDeep};
    background: ${color.brandBg};
    border-radius: ${radius.pill}px;
    padding: 2px 8px;
    white-space: nowrap;
  `,
  colHint: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.06em;
    color: ${color.text4};
    margin-bottom: 6px;
  `,
  sysBadge: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
    background: ${color.divider};
    border-radius: ${radius.r4}px;
    padding: 2px 6px;
  `,
  tabChips: css`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  `,
  tabChip: css`
    display: inline-flex;
    align-items: center;
    height: 24px;
    padding: 0 8px;
    border-radius: ${radius.r6}px;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
  `,
  tabChipBuiltin: css`
    background: ${color.divider};
    color: ${color.text2};
  `,
  tabChipCustom: css`
    background: ${color.violetChip};
    color: ${color.violetInk};
  `,
  roleRow: css`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  `,
  roleChip: css`
    display: inline-flex;
    align-items: center;
    height: 28px;
    padding: 0 12px;
    border-radius: ${radius.pill}px;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    white-space: nowrap;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text3};
  `,
  roleChipOn: css`
    border-color: ${color.brand};
    background: ${color.brandBg};
    color: ${color.brandInk};
  `,
  cardActions: css`
    display: flex;
    gap: 8px;
    margin-top: 2px;
  `,
  actBtn: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 34px;
    padding: 0 12px;
    border-radius: ${radius.r8}px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text2};
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
  `,
  actPrimary: css`
    flex: 1;
    color: ${color.brandInk};
    border-color: ${color.brandLine};
    background: ${color.brandBgSoft};
  `,
  actDanger: css`
    color: ${color.dangerDeep};
    border-color: ${color.dangerLine};
  `,
}));
