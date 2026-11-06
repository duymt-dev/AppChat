// Khối "Việc cần tôi" / "AI hôm nay" / "Credit" (TIP-038 pha 2) — dựng theo khung thẻ Tổng quan (prototype L1132), token D41.
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

export const useWorkStyles = createStyles(({ css, responsive }) => ({
  grid: css`
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    gap: 12px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  side: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  list: css`
    display: flex;
    flex-direction: column;
  `,
  row: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid ${color.divider};
    &:last-child {
      border-bottom: 0;
    }
  `,
  icon: css`
    width: 32px;
    height: 32px;
    border-radius: ${radius.r8}px;
    background: ${color.brandBg};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  title: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.ink};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  sub: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
    margin-top: 2px;
  `,
  btn: css`
    height: 30px;
    padding: 0 12px;
    border-radius: ${radius.r8}px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    font-family: inherit;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    cursor: pointer;
    white-space: nowrap;
    ${responsive.md} {
      min-height: 44px;
    }
  `,
  ask: css`
    border-color: ${color.text};
    background: ${color.text};
    color: ${color.white};
  `,
  empty: css`
    padding: 16px 0;
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
  `,
  metrics: css`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  `,
  metricLabel: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
  `,
  metricValue: css`
    font-size: ${font.scale.s22}px;
    font-weight: ${font.weight.heavy};
    color: ${color.ink};
    margin-top: 2px;
  `,
  low: css`
    color: ${color.dangerStrong};
  `,
}));
