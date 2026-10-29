// Ô bảng / thẻ kanban / thẻ mobile Hợp đồng — prototype L5376–5411.
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

const clip = `
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const useContractCellStyles = createStyles(({ css }) => ({
  code: css`
    font-family: ${font.mono};
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
    cursor: pointer;
  `,
  custCell: css`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  `,
  av: css`
    width: 30px;
    height: 30px;
    border-radius: 50%;
    color: ${color.white};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.heavy};
    flex-shrink: 0;
  `,
  cust: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    ${clip}
  `,
  svc: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
    display: block;
    ${clip}
  `,
  value: css`
    display: block;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    text-align: right;
  `,
  end: css`
    display: block;
    text-align: right;
  `,
  kind: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
  `,
  by: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    font-weight: ${font.weight.semibold};
    display: block;
    ${clip}
  `,
  at: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
  `,
  eff: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
    display: block;
    ${clip}
  `,
  quote: css`
    font-size: ${font.scale.s12}px;
    font-family: ${font.mono};
    color: ${color.info};
  `,
  status: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    padding: 2px 8px;
    border-radius: ${radius.r12}px;
    white-space: nowrap;
  `,
  badge: css`
    display: block;
    margin-top: 2px;
    font-size: ${font.scale.s10}px;
    font-weight: ${font.weight.bold};
    color: ${color.amberText};
  `,
  ai: css`
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  `,
  aiText: css`
    flex: 1;
    min-width: 0;
    font-size: ${font.scale.s12}px;
    color: ${color.aiHintText};
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
    background: ${color.brand};
    display: inline-grid;
    place-items: center;
    cursor: pointer;
    flex-shrink: 0;
    border: none;
    padding: 0;
  `,
  kCard: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    padding: 12px;
    cursor: pointer;
  `,
  kRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    min-width: 0;
  `,
  kCode: css`
    font-family: ${font.mono};
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
  `,
  kAv: css`
    width: 26px;
    height: 26px;
    font-size: ${font.scale.s12}px;
  `,
  kSvc: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
    margin-bottom: 8px;
    ${clip}
  `,
  kVal: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    color: ${color.brandInk};
  `,
  mRow: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  `,
}));
