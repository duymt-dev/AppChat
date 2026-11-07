// Hero theo kênh + A/B Testing + Lịch gửi sắp tới — prototype L3410–3455.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

const card = `
  background: ${color.surface};
  border: 1px solid ${color.border};
  border-radius: ${radius.r12}px;
  padding: 16px;
`;
const clip = `
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const useHeroStyles = createStyles(({ css, responsive }) => ({
  hero: css`
    border: 1px solid ${color.mkHeroLine};
    border-radius: ${radius.r16}px;
    padding: 20px;
    margin-bottom: 16px;
  `,
  heroTop: css`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
    ${responsive.md} {
      flex-direction: column;
    }
  `,
  heroT: css`
    font-size: ${font.scale.s20}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  heroD: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
    line-height: 1.5;
    margin-top: 2px;
  `,
  compose: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 40px;
    color: ${color.white};
    border-radius: ${radius.r10}px;
    border: none;
    padding: 0 16px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    font-family: inherit;
    cursor: pointer;
    flex-shrink: 0;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  grid4: css`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    ${responsive.md} {
      grid-template-columns: repeat(2, 1fr);
    }
  `,
  stat: css`
    background: ${color.surface};
    border: 1px solid ${color.mkKpiLine};
    border-radius: ${radius.r12}px;
    padding: 12px 16px;
  `,
  statL: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    font-weight: ${font.weight.semibold};
  `,
  statV: css`
    font-size: ${font.scale.s24}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    margin-top: 4px;
    letter-spacing: -0.01em;
  `,
  two: css`
    display: grid;
    grid-template-columns: 1.3fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  card: css`
    ${card}
  `,
  cardH: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  `,
  cardT: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  cardN: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
  `,
  grow: css`
    flex: 1;
  `,
  col: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  colS: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  ab: css`
    border: 1px solid ${color.pillBg};
    border-radius: ${radius.r10}px;
    padding: 12px;
  `,
  abT: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    margin-bottom: 8px;
  `,
  abRow: css`
    display: flex;
    gap: 8px;
    margin-bottom: 6px;
  `,
  abV: css`
    flex: 1;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 6px 8px;
  `,
  abK: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    color: ${color.text4};
  `,
  abN: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  abW: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
  `,
  sch: css`
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid ${color.divider};
    padding-bottom: 8px;
  `,
  dot: css`
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex-shrink: 0;
  `,
  min0: css`
    flex: 1;
    min-width: 0;
  `,
  schN: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    ${clip}
  `,
  schS: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  schW: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    white-space: nowrap;
  `,
}));
