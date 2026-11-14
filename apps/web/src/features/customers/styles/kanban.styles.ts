// Thẻ kanban Khách hàng — prototype L2554–2590 (dải "website" 54px · avatar · kênh · tag + popover gắn tag).
import { createStyles } from 'antd-style';
import { color, font, radius, shadow } from '@appchat/ui';

export const useKanbanCardStyles = createStyles(({ css }) => ({
  card: css`
    position: relative;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    cursor: pointer;
    box-shadow: ${shadow.kanbanCard};
    &:hover {
      background: ${color.rowHover};
    }
  `,
  web: css`
    height: 54px;
    border-radius: ${radius.r8}px ${radius.r8}px 0 0;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: flex-end;
    padding: 6px 8px;
  `,
  webIcon: css`
    position: absolute;
    top: 6px;
    left: 8px;
    width: 18px;
    height: 18px;
    border-radius: ${radius.r4}px;
    background: ${color.webIcon};
    display: grid;
    place-items: center;
  `,
  domain: css`
    font-size: ${font.scale.s10}px;
    font-weight: ${font.weight.bold};
    color: ${color.white};
    background: ${color.webTag};
    border-radius: ${radius.r4}px;
    padding: 2px 6px;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  body: css`
    padding: 8px 12px 12px;
  `,
  top: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  av: css`
    width: 26px;
    height: 26px;
    border-radius: 50%;
    color: ${color.white};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.heavy};
    flex-shrink: 0;
  `,
  grow: css`
    min-width: 0;
    flex: 1;
  `,
  name: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  sub: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  chan: css`
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 8px;
  `,
  chanDot: css`
    width: 6px;
    height: 6px;
    border-radius: ${radius.r4}px;
  `,
  chanName: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
    font-weight: ${font.weight.semibold};
  `,
  tags: css`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 8px;
    align-items: center;
  `,
  tag: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    border-radius: ${radius.r6}px;
    padding: 2px 6px;
  `,
  tagX: css`
    cursor: pointer;
    opacity: 0.6;
    font-weight: ${font.weight.bold};
    border: none;
    background: transparent;
    color: inherit;
    padding: 0;
    font-size: inherit;
    font-family: inherit;
  `,
  rel: css`
    position: relative;
  `,
  addTag: css`
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    border: 1px dashed ${color.dashLine};
    border-radius: ${radius.r6}px;
    padding: 2px 6px;
    color: ${color.text3};
    cursor: pointer;
    background: transparent;
    font-family: inherit;
  `,
  veil: css`
    position: fixed;
    inset: 0;
    z-index: 90;
  `,
  pop: css`
    position: absolute;
    left: 0;
    top: 24px;
    z-index: 91;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    box-shadow: ${shadow.rowMenu};
    padding: 8px;
    width: 184px;
  `,
  popTitle: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text2};
    margin-bottom: 6px;
  `,
  opts: css`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  `,
  opt: css`
    cursor: pointer;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    border-radius: ${radius.r6}px;
    padding: 2px 8px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text3};
    font-family: inherit;
  `,
  cf: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid ${color.divider};
  `,
  cfRow: css`
    display: flex;
    gap: 6px;
    font-size: ${font.scale.s12}px;
    min-width: 0;
  `,
  cfLabel: css`
    color: ${color.text3};
    flex-shrink: 0;
  `,
  cfValue: css`
    color: ${color.text};
    font-weight: ${font.weight.semibold};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
}));
