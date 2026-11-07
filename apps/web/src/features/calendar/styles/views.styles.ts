// Chế độ xem Lịch hẹn — danh sách (L3915–3943), tuần / ngày (L3947–3966), tháng (L3970–3992).
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

const clip = `
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
export const useCalViewStyles = createStyles(({ css, responsive }) => ({
  group: css`
    margin-bottom: 16px;
  `,
  groupH: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    margin-bottom: 8px;
    padding: 0 4px;
    span {
      color: ${color.text4};
      font-weight: ${font.weight.medium};
    }
  `,
  box: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    overflow: hidden;
  `,
  row: css`
    display: grid;
    grid-template-columns: 80px minmax(0, 1fr) 200px 160px 120px 120px 100px;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-top: 1px solid ${color.divider};
    cursor: pointer;
    &:first-child {
      border-top: none;
    }
    &:hover {
      background: ${color.bg};
    }
    ${responsive.md} {
      grid-template-columns: 64px minmax(0, 1fr) auto;
      > :nth-child(3),
      > :nth-child(4),
      > :nth-child(6) {
        display: none;
      }
    }
  `,
  fu: css`
    background: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 9px,
      ${color.fuStripe} 9px,
      ${color.fuStripe} 18px
    );
  `,
  time: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  sub: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    ${clip}
  `,
  fuTag: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    color: ${color.purple};
  `,
  min0: css`
    min-width: 0;
  `,
  svc: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 2px;
  `,
  sDot: css`
    width: 6px;
    height: 6px;
    border-radius: ${radius.r4}px;
    flex-shrink: 0;
  `,
  name: css`
    font-weight: ${font.weight.semibold};
    font-size: ${font.scale.s14}px;
    color: ${color.text};
    ${clip}
  `,
  who: css`
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  `,
  av: css`
    width: 24px;
    height: 24px;
    border-radius: 50%;
    color: ${color.white};
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  whoN: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    ${clip}
  `,
  whoS: css`
    font-size: ${font.scale.s11}px;
    color: ${color.text4};
  `,
  chL: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  chV: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  st: css`
    display: inline-flex;
    align-items: center;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    padding: 2px 8px;
    border-radius: ${radius.r8}px;
    white-space: nowrap;
  `,
  due: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    white-space: nowrap;
  `,
  ai: css`
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  `,
  aiT: css`
    flex: 1;
    min-width: 0;
    font-size: ${font.scale.s12}px;
    color: ${color.aiHint};
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  `,
  aiDo: css`
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: none;
    padding: 0;
    background: ${color.brand};
    display: inline-grid;
    place-items: center;
    cursor: pointer;
    flex-shrink: 0;
  `,
  aiPeek: css`
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: none;
    padding: 0;
    background: ${color.aiPeekBg};
    display: inline-grid;
    place-items: center;
    cursor: pointer;
    flex-shrink: 0;
  `,
  pay: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    white-space: nowrap;
  `,
  doneBtn: css`
    display: inline-flex;
    align-items: center;
    height: 28px;
    padding: 0 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text2};
    background: ${color.surface};
    cursor: pointer;
    font-family: inherit;
  `,
  empty: css`
    padding: 24px;
    text-align: center;
    color: ${color.text4};
    font-size: ${font.scale.s14}px;
  `,
}));
