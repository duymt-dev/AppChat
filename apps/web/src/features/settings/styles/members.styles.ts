// Mục Thành viên — prototype L5862–5888: thanh công cụ, banner AI xanh nhạt, lưới 40 / 2fr / 1.2fr / 1fr / 1fr / 0.9fr / 44,
// avatar 36 + chấm online, chip vai trò viền, trạng thái Active (chấm) / Offline / Chờ xác nhận.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

const pill = `
  display: inline-flex;
  align-items: center;
  padding: 2px 12px;
  border-radius: ${radius.r12}px;
  font-size: ${font.scale.s13}px;
  font-weight: ${font.weight.bold};
`;

export const useMembersStyles = createStyles(({ css, responsive }) => ({
  bar: css`
    margin-bottom: 16px;
    ${responsive.md} {
      flex-wrap: wrap;
    }
  `,
  hideM: css`
    ${responsive.md} {
      display: none !important;
    }
  `,
  ai: css`
    display: flex;
    align-items: center;
    gap: 12px;
    background: ${color.brandBgSoft};
    border: 1px solid ${color.brandBorder};
    border-radius: ${radius.r12}px;
    padding: 12px 16px;
    margin-bottom: 16px;
    ${responsive.md} {
      flex-wrap: wrap;
    }
  `,
  aiIc: css`
    width: 34px;
    height: 34px;
    border-radius: ${radius.r8}px;
    background: ${color.surface};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  aiT: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  aiS: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    margin-top: 2px;
  `,
  aiBtn: css`
    display: inline-flex;
    align-items: center;
    height: 32px;
    border: 1px solid ${color.brandBorder};
    background: ${color.surface};
    border-radius: ${radius.r8}px;
    padding: 0 12px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    cursor: pointer;
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  grid: css`
    grid-template-columns: 40px 2fr 1.2fr 1fr 1fr 0.9fr 44px;
  `,
  who: css`
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    ${responsive.md} {
      flex: 1 1 100%;
    }
  `,
  avWrap: css`
    position: relative;
    flex-shrink: 0;
  `,
  av: css`
    width: 36px;
    height: 36px;
    border-radius: 50%;
    color: ${color.white};
    display: grid;
    place-items: center;
    font-weight: ${font.weight.heavy};
    font-size: ${font.scale.s15}px;
  `,
  dot: css`
    position: absolute;
    right: 0;
    bottom: 0;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${color.okStrong};
    border: 2px solid ${color.surface};
  `,
  name: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  email: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  role: css`
    display: inline-flex;
    align-items: center;
    padding: 4px 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text2};
    white-space: nowrap;
  `,
  dept: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    font-weight: ${font.weight.medium};
  `,
  last: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.medium};
    color: ${color.text4};
  `,
  lastOn: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.medium};
    color: ${color.brandInk};
  `,
  st_active: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.brandInk};
  `,
  st_offline: css`
    ${pill}
    background: ${color.lyRuleChip};
    color: ${color.text3};
  `,
  st_pending: css`
    ${pill}
    background: ${color.amberBg};
    color: ${color.amberText};
  `,
  stDot: css`
    width: 7px;
    height: 7px;
    border-radius: ${radius.r4}px;
    background: ${color.brandInk};
  `,
}));
