// Tổng quan — prototype L1079–1136 (+ < md L218–240). Giá trị theo thang token D41.
import { createStyles } from 'antd-style';
import { color, font, gradient, radius, shadow } from '@appchat/ui';

export const useDashStyles = createStyles(({ css, responsive }) => ({
  wrap: css`
    padding: 24px 28px;
    background: ${color.bg};
    display: flex;
    flex-direction: column;
    gap: 20px;
    font-family: ${font.family};
    line-height: normal;
    ${responsive.md} {
      padding: 16px 12px;
      gap: 16px;
    }
  `,
  greet: css`
    display: flex;
    align-items: center;
    gap: 16px;
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  hello: css`
    font-size: ${font.scale.s22}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: -0.02em;
    color: ${color.text};
  `,
  helloSub: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
    margin-top: 2px;
  `,
  stats: css`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    ${responsive.md} {
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
  `,
  stat: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 16px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    min-width: 0;
  `,
  statLabel: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    margin-bottom: 6px;
  `,
  statValue: css`
    font-size: ${font.scale.s28}px;
    font-weight: ${font.weight.heavy};
    color: ${color.ink};
    letter-spacing: -0.02em;
    line-height: 1.1;
  `,
  statNote: css`
    font-size: ${font.scale.s12}px;
    margin-top: 6px;
    font-family: ${font.mono};
  `,
  up: css`
    color: ${color.okText};
  `,
  warn: css`
    color: ${color.warnAmber};
  `,
  muted: css`
    color: ${color.text4};
  `,
  statIcon: css`
    width: 30px;
    height: 30px;
    border-radius: ${radius.r8}px;
    background: ${color.brandBg};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  card: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r16}px;
    box-shadow: ${shadow.cardSoft};
    overflow: hidden;
  `,
  cardHead: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border-bottom: 1px solid ${color.divider};
  `,
  num: css`
    width: 28px;
    height: 28px;
    border-radius: ${radius.r8}px;
    color: ${color.white};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.heavy};
    flex-shrink: 0;
  `,
  cardTitle: css`
    font-size: ${font.scale.s16}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    letter-spacing: -0.01em;
  `,
  cardSub: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    margin-top: 2px;
  `,
  cardBody: css`
    padding: 16px;
  `,
  pills: css`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  `,
  pill: css`
    display: inline-flex;
    align-items: center;
    height: 30px;
    padding: 0 12px;
    border-radius: ${radius.pill}px;
    background: ${color.bg};
    border: 1px solid ${color.border};
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.pillText};
    white-space: nowrap;
  `,
  mono: css`
    font-family: ${font.mono};
  `,
  brandGrad: css`
    background: ${gradient.brandSoft};
  `,
}));
