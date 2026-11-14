// Menu avatar + đổi workspace + ngôn ngữ — prototype L1034–1070.
import { createStyles } from 'antd-style';
import { color, font, gradient, radius, shadow, z } from '@appchat/ui';

export const useUserMenuStyles = createStyles(({ css }) => ({
  head: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 12px 12px;
    border-bottom: 1px solid ${color.divider};
  `,
  avatar: css`
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: ${gradient.avatar};
    color: ${color.white};
    display: grid;
    place-items: center;
    font-weight: ${font.weight.heavy};
    font-size: ${font.size.upgrade}px;
  `,
  name: css`
    font-weight: ${font.weight.bold};
    font-size: ${font.size.bodyLg}px;
    color: ${color.text};
  `,
  sub: css`
    font-size: ${font.size.small}px;
    color: ${color.text3};
  `,
  duty: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: ${font.size.tag}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
    background: ${color.brandBg};
    border-radius: ${radius.r20}px;
    padding: 2px 8px;
    & i {
      width: 5px;
      height: 5px;
      border-radius: ${radius.r4}px;
      background: ${color.brand};
    }
  `,
  wsBox: css`
    padding: 8px 12px;
    border-bottom: 1px solid ${color.divider};
    background: ${color.bg};
  `,
  wsEyebrow: css`
    font-size: ${font.size.tag}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: ${color.text4};
    margin-bottom: 6px;
  `,
  ws: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 8px;
    border-radius: ${radius.r8}px;
    cursor: pointer;
    margin-bottom: 4px;
    border: 1px solid transparent;
    background: ${color.surface};
    &:last-child {
      margin-bottom: 0;
    }
  `,
  wsMark: css`
    width: 30px;
    height: 30px;
    border-radius: ${radius.sm}px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    font-weight: ${font.weight.heavy};
    font-size: ${font.size.body}px;
  `,
  wsName: css`
    font-size: ${font.size.body}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  wsPlan: css`
    font-size: ${font.size.eyebrow}px;
    color: ${color.text4};
  `,
  wallet: css`
    margin-left: auto;
    font-size: ${font.size.small}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
  `,
  logout: css`
    font-weight: ${font.weight.semibold};
    color: ${color.danger};
  `,
  langSub: css`
    position: fixed;
    width: 236px;
    max-height: 78vh;
    overflow-y: auto;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.lg}px;
    box-shadow: ${shadow.flyout};
    padding: 6px;
    z-index: ${z.modal};
  `,
  flag: css`
    width: 20px;
    height: 14px;
    border-radius: ${radius.r4}px;
    object-fit: cover;
    display: block;
  `,
  check: css`
    color: ${color.brand};
    font-weight: ${font.weight.heavy};
    font-size: ${font.scale.s14}px;
  `,
}));
