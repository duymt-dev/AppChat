// "Agent của bạn" — thẻ agent đang có (thống kê, mức AI, phiên bản, bật / tạm dừng). Dùng pattern thẻ Coworks (prototype L1340–1384).
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius, shadow } from '@appchat/ui';

export const useMineStyles = createStyles(({ css, responsive }) => ({
  wrap: css`
    margin-top: 20px;
  `,
  grid: css`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 12px;
    margin-top: 12px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  card: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: ${shadow.table};
  `,
  head: css`
    display: flex;
    align-items: center;
    gap: 12px;
  `,
  face: css`
    width: 40px;
    height: 40px;
    border-radius: ${radius.r12}px;
    background: ${gradient.ai};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s20}px;
    flex-shrink: 0;
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  name: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  role: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    margin-top: 2px;
  `,
  swHit: css`
    border: none;
    background: transparent;
    padding: 0;
    cursor: pointer;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  sw: css`
    width: 42px;
    height: 24px;
    border-radius: ${radius.r12}px;
    position: relative;
    display: block;
    span {
      position: absolute;
      top: 2px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: ${color.white};
      box-shadow: ${shadow.knob};
      transition: left 0.15s;
    }
  `,
  pills: css`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  `,
  pill: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    border-radius: ${radius.pill}px;
    padding: 2px 8px;
    white-space: nowrap;
  `,
  stats: css`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    border-top: 1px solid ${color.divider};
    padding-top: 12px;
  `,
  statL: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  statV: css`
    font-size: ${font.scale.s16}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    margin-top: 2px;
  `,
  foot: css`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  `,
  act: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 32px;
    padding: 0 12px;
    border-radius: ${radius.r8}px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text2};
    cursor: pointer;
    font-family: inherit;
    &:hover {
      background: ${color.brandBg};
      border-color: ${color.chipHoverLine};
    }
    ${responsive.md} {
      height: ${layout.touch}px;
      min-width: ${layout.touch}px;
    }
  `,
  danger: css`
    margin-left: auto;
  `,
  empty: css`
    padding: 24px 0;
    color: ${color.text4};
    font-size: ${font.scale.s14}px;
  `,
}));
