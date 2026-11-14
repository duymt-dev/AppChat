// Hộp Tuỳ chỉnh Hồ sơ 360° — prototype L690–735 (620px): thứ tự & hiển thị tab, thư viện khối, thêm tab mới.
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

export const useProfileLayoutEditorStyles = createStyles(({ css }) => ({
  subT: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
    margin-top: 2px;
  `,
  sectionT: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${color.text};
  `,
  tabRow: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    padding: 8px 12px;
    background: ${color.surface};
  `,
  tabRowHead: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  tabInput: css`
    height: 34px;
    padding: 0 8px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
    background: ${color.surface};
    color: ${color.text};
    flex: 1;
    min-width: 0;
    font-weight: ${font.weight.bold};
  `,
  badge: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.heavy};
    border-radius: ${radius.r4}px;
    padding: 2px 6px;
    white-space: nowrap;
  `,
  badgeCustom: css`
    color: ${color.violetInk};
    background: ${color.violetChip};
  `,
  badgeBuiltin: css`
    color: ${color.text3};
    background: ${color.divider};
  `,
  iconBtn: css`
    width: 28px;
    height: 28px;
    border-radius: ${radius.r6}px;
    display: grid;
    place-items: center;
    cursor: pointer;
    color: ${color.text3};
    border: 1px solid ${color.border};
    background: ${color.surface};
    font-size: ${font.scale.s13}px;
    flex-shrink: 0;
  `,
  iconBtnDanger: css`
    color: ${color.dangerDeep};
  `,
  blocksBox: css`
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid ${color.divider};
  `,
  blocksHint: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
    margin-bottom: 6px;
  `,
  chipRow: css`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  `,
  restoreBox: css`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    padding: 8px 12px;
    border: 1px dashed ${color.text4};
    border-radius: ${radius.r10}px;
  `,
  restoreHint: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
    margin-right: 4px;
  `,
  restoreChip: css`
    display: inline-flex;
    align-items: center;
    height: 28px;
    padding: 0 12px;
    border-radius: ${radius.pill}px;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    border: 1px solid ${color.brandLine};
    background: ${color.brandBg};
    color: ${color.brandInk};
  `,
  addOpen: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 34px;
    padding: 0 12px;
    border-radius: ${radius.r8}px;
    border: 1px solid ${color.brandLine};
    background: ${color.brandBg};
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
    cursor: pointer;
    white-space: nowrap;
    align-self: flex-start;
  `,
  addBox: css`
    border: 1.5px solid ${color.brand};
    border-radius: ${radius.r12}px;
    padding: 12px;
    background: ${color.brandBgSoft};
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  addT: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  addFootHint: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
  `,
  addFoot: css`
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  `,
  status: css`
    flex: 1;
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
  `,
  conflict: css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    margin-bottom: 12px;
    border-radius: ${radius.r8}px;
    background: ${color.dangerSoftBg};
    color: ${color.dangerDeep};
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    & > span {
      flex: 1;
      min-width: 0;
    }
  `,
}));
