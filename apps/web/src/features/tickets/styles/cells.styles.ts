// Ô bảng / thẻ kanban / thẻ mobile Ticket — prototype L4899–4950 (grid 34 2.2fr 1.3fr .9fr 1.3fr 1fr .9fr 120 48).
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

const clip = `
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const round = `
  border-radius: 50%;
  color: ${color.white};
  display: grid;
  place-items: center;
  font-weight: ${font.weight.heavy};
  flex-shrink: 0;
`;

export const useTicketCellStyles = createStyles(({ css }) => ({
  min0: css`
    min-width: 0;
  `,
  idRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 2px;
  `,
  code: css`
    font-size: ${font.scale.s12}px;
    font-family: ${font.mono};
    font-weight: ${font.weight.bold};
    color: ${color.text4};
  `,
  pr: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    padding: 2px 6px;
    border-radius: ${radius.r10}px;
  `,
  prDot: css`
    width: 5px;
    height: 5px;
    border-radius: ${radius.r4}px;
  `,
  title: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    ${clip}
  `,
  cat: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  who: css`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  `,
  ch: css`
    ${round}
    width: 22px;
    height: 22px;
    font-size: ${font.scale.s11}px;
  `,
  av: css`
    ${round}
    width: 24px;
    height: 24px;
    font-size: ${font.scale.s12}px;
  `,
  name: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    ${clip}
  `,
  owner: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    ${clip}
  `,
  subT: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    ${clip}
  `,
  st: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    white-space: nowrap;
  `,
  stDot: css`
    width: 7px;
    height: 7px;
    border-radius: ${radius.r4}px;
  `,
  sla: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    white-space: nowrap;
  `,
  slaL: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
  `,
  upd: css`
    display: block;
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    text-align: right;
    white-space: nowrap;
  `,
  end: css`
    display: block;
    text-align: right;
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
  aiPeek: css`
    ${round}
    width: 24px;
    height: 24px;
    background: ${color.aiPeekBg};
    border: none;
    cursor: pointer;
  `,
  menu: css`
    display: flex;
    justify-content: flex-end;
  `,
  kCard: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    padding: 12px;
    cursor: pointer;
  `,
  kTop: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  `,
  kPr: css`
    font-size: ${font.scale.s10}px;
    font-weight: ${font.weight.bold};
    padding: 2px 6px;
    border-radius: ${radius.r8}px;
  `,
  kTitle: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    line-height: 1.4;
    margin-bottom: 8px;
  `,
  kRow: css`
    display: flex;
    align-items: center;
    gap: 6px;
  `,
  kCh: css`
    ${round}
    width: 18px;
    height: 18px;
    font-size: ${font.scale.s10}px;
  `,
  kCo: css`
    flex: 1;
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
    ${clip}
  `,
  kAv: css`
    ${round}
    width: 20px;
    height: 20px;
    font-size: ${font.scale.s10}px;
  `,
  kSla: css`
    margin-top: 6px;
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
  `,
  mRow: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 4px;
  `,
}));
