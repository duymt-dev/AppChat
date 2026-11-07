// Ô của bảng / thẻ kanban / thẻ mobile Khách hàng — prototype L2516–2531, L2553–2590.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useCellStyles = createStyles(({ css }) => ({
  code: css`
    font-size: ${font.scale.s12}px;
    font-family: ${font.mono};
    color: ${color.text3};
  `,
  nameCell: css`
    display: flex;
    gap: 8px;
    align-items: center;
    min-width: 0;
  `,
  avatar: css`
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-weight: ${font.weight.bold};
    font-size: ${font.scale.s12}px;
    color: ${color.white};
    flex-shrink: 0;
  `,
  min0: css`
    min-width: 0;
    flex: 1;
  `,
  name: css`
    font-weight: ${font.weight.semibold};
    color: ${color.brandDeep};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  sub: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  share: css`
    margin-left: 4px;
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    color: ${color.violetInk};
    background: ${color.violetBg};
    border-radius: ${radius.r6}px;
    padding: 2px 6px;
  `,
  date: css`
    font-size: ${font.scale.s13}px;
    white-space: nowrap;
  `,
  dateMain: css`
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  time: css`
    font-size: ${font.scale.s11}px;
    color: ${color.text4};
  `,
  cell: css`
    display: block;
    font-size: ${font.scale.s13}px;
    color: ${color.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  muted: css`
    color: ${color.text3};
  `,
  bold: css`
    font-weight: ${font.weight.semibold};
  `,
  chan: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    white-space: nowrap;
  `,
  dot: css`
    width: 7px;
    height: 7px;
    border-radius: ${radius.r4}px;
    flex-shrink: 0;
  `,
  email: css`
    color: ${color.info};
  `,
  mono: css`
    font-family: ${font.mono};
  `,
  zalo: css`
    color: ${color.zalo};
  `,
  status: css`
    display: inline-flex;
    align-items: center;
    height: 22px;
    padding: 0 8px;
    border-radius: ${radius.pill}px;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    white-space: nowrap;
  `,
  owner: css`
    font-size: ${font.scale.s13}px;
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
  `,
  ownerAv: css`
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: ${font.scale.s10}px;
    font-weight: ${font.weight.bold};
    color: ${color.white};
    flex-shrink: 0;
  `,
  aiCell: css`
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  `,
  aiHint: css`
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
  aiBtn: css`
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
    background: ${color.aiPeekBg};
  `,
  end: css`
    display: flex;
    justify-content: flex-end;
  `,
  // thẻ mobile (< md)
  mTop: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  mMeta: css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 12px;
    margin-top: 8px;
    min-height: ${layout.touch / 2}px;
  `,
}));
