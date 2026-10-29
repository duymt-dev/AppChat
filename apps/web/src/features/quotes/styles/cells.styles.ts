// Ô bảng / thẻ kanban / thẻ mobile Báo giá — prototype L4993–5020.
import { createStyles } from 'antd-style';
import { color, font, radius, shadow } from '@appchat/ui';

export const useQuoteCellStyles = createStyles(({ css }) => ({
  code: css`
    font-family: ${font.mono};
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
  `,
  rev: css`
    font-size: ${font.scale.s10}px;
    color: ${color.codeMuted};
    font-weight: ${font.weight.bold};
  `,
  cust: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
  `,
  svc: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
  `,
  muted: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
  `,
  by: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
    font-weight: ${font.weight.semibold};
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
  status: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    border-radius: ${radius.r6}px;
    padding: 2px 8px;
    white-space: nowrap;
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
  aiDot: css`
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: inline-grid;
    place-items: center;
    cursor: pointer;
    flex-shrink: 0;
    border: none;
    padding: 0;
  `,
  aiDo: css`
    background: ${color.brand};
  `,
  aiPeek: css`
    background: ${color.violetChip};
  `,
  kCard: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    padding: 12px;
    cursor: pointer;
    box-shadow: ${shadow.kanbanCard};
  `,
  kTop: css`
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
  `,
  kCode: css`
    font-family: ${font.mono};
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    flex: 1;
  `,
  kVal: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.heavy};
    color: ${color.brandInk};
  `,
  kCust: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  kSvc: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 2px;
  `,
  kFoot: css`
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 8px;
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  kAv: css`
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${color.commentAvatar};
    color: ${color.text2};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s10}px;
    font-weight: ${font.weight.heavy};
  `,
  mRow: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  `,
}));
