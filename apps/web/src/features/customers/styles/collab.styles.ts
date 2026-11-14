// Modal D32 "Người phụ trách" / "Chuyển phụ trách" — không có trong prototype; dựng bằng token theo khung modal L2600.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useCollabStyles = createStyles(({ css, responsive }) => ({
  label: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: ${color.text4};
    margin: 12px 0 8px;
    &:first-child {
      margin-top: 0;
    }
  `,
  person: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    border-bottom: 1px solid ${color.dividerSoft};
    min-height: ${layout.touch}px;
  `,
  av: css`
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: ${color.brandDeep};
    color: ${color.white};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    flex-shrink: 0;
  `,
  name: css`
    flex: 1;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  role: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    color: ${color.violetInk};
    background: ${color.violetBg};
    border-radius: ${radius.r6}px;
    padding: 2px 6px;
  `,
  none: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
    padding: 8px 0 12px;
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  roleSel: css`
    width: 140px;
    ${responsive.md} {
      width: 100%;
    }
  `,
  checks: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
  `,
  check: css`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: ${font.scale.s14}px;
    color: ${color.text};
    min-height: 36px;
    accent-color: ${color.brand};
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  hint: css`
    margin-top: 12px;
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    background: ${color.bg};
    border-radius: ${radius.r8}px;
    padding: 8px 12px;
  `,
}));
