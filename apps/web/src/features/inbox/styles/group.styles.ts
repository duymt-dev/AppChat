// Thông tin nhóm Zalo — prototype L1904–2009 (kiểu Zalo: khối trắng cách nhau 8px nền xám).
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useGroupStyles = createStyles(({ css, responsive }) => ({
  top: css`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 52px;
    background: ${color.surface};
    border-bottom: 1px solid ${color.border};
    flex-shrink: 0;
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.bold};
    color: ${color.groupInk};
    position: relative;
  `,
  topClose: css`
    position: absolute;
    right: 4px;
  `,
  avMore: css`
    font-size: ${font.scale.s13}px;
  `,
  boardTitle: css`
    padding: 12px 16px 4px;
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.bold};
    color: ${color.groupInk};
  `,
  foldHead: css`
    width: 100%;
    display: flex;
    align-items: center;
    padding: 12px 16px;
    cursor: pointer;
    border: none;
    background: none;
    font-family: inherit;
    text-align: left;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  foldMeta: css`
    font-size: ${font.scale.s13}px;
    color: ${color.groupSub};
    margin-right: 8px;
  `,
  caret: css`
    font-size: ${font.scale.s12}px;
    color: ${color.groupSub};
    width: 12px;
    text-align: center;
  `,
  seeAllWrap: css`
    padding: 12px 16px;
  `,
  seeAll: css`
    width: 100%;
    height: 34px;
    border-radius: ${radius.r6}px;
    background: ${color.groupAction};
    border: none;
    font-family: inherit;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.groupInk};
    cursor: pointer;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  linkIcon: css`
    width: 34px;
    height: 34px;
    border-radius: ${radius.r4}px;
    background: ${color.groupAction};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  endPad: css`
    height: 16px;
  `,
  scroll: css`
    flex: 1;
    overflow-y: auto;
  `,
  hero: css`
    background: ${color.surface};
    padding: 20px 16px 16px;
    text-align: center;
  `,
  avs: css`
    position: relative;
    width: 64px;
    height: 64px;
    margin: 0 auto;
  `,
  av: css`
    position: absolute;
    width: 42px;
    height: 42px;
    border-radius: 50%;
    border: 2px solid ${color.surface};
    display: grid;
    place-items: center;
    color: ${color.white};
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
  `,
  name: css`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 12px;
    font-size: ${font.scale.s16}px;
    font-weight: ${font.weight.bold};
    color: ${color.groupInk};
  `,
  acts: css`
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-top: 16px;
  `,
  act: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    width: 62px;
    border: none;
    background: none;
    font-family: inherit;
    padding: 0;
    font-size: ${font.scale.s12}px;
    color: ${color.groupInk};
    line-height: 1.3;
  `,
  actIcon: css`
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: ${color.groupAction};
    display: grid;
    place-items: center;
  `,
  gap: css`
    height: 8px;
    background: ${color.divider};
  `,
  block: css`
    background: ${color.surface};
  `,
  row: css`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    cursor: pointer;
    border: none;
    background: none;
    font-family: inherit;
    text-align: left;
    &:hover {
      background: ${color.bg};
    }
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  label: css`
    font-size: ${font.scale.s14}px;
    color: ${color.groupInk};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  sub: css`
    font-size: ${font.scale.s12}px;
    color: ${color.groupSub};
    margin-top: 2px;
  `,
  danger: css`
    color: ${color.danger};
  `,
  title: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.bold};
    color: ${color.groupInk};
    flex: 1;
  `,
  member: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px 8px 48px;
  `,
  mav: css`
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: ${color.white};
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    flex-shrink: 0;
  `,
  media: css`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2px;
    padding: 0 16px;
  `,
  tile: css`
    aspect-ratio: 1;
    border-radius: ${radius.r4}px;
    display: grid;
    place-items: center;
    color: ${color.whiteSoft};
    font-size: ${font.scale.s10}px;
    font-weight: ${font.weight.bold};
  `,
  ext: css`
    width: 34px;
    height: 38px;
    border-radius: ${radius.r4}px;
    display: grid;
    place-items: center;
    color: ${color.white};
    font-size: ${font.scale.s10}px;
    font-weight: ${font.weight.heavy};
    flex-shrink: 0;
  `,
  link: css`
    font-size: ${font.scale.s12}px;
    color: ${color.zalo};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  seg: css`
    display: flex;
    padding: 2px;
    background: ${color.groupAction};
    border-radius: ${radius.r8}px;
    gap: 2px;
    margin: 0 16px 8px;
  `,
  segBtn: css`
    flex: 1;
    height: 30px;
    border: none;
    border-radius: ${radius.r6}px;
    background: transparent;
    font-family: inherit;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.groupSub};
    cursor: pointer;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  segOn: css`
    background: ${color.surface};
    color: ${color.groupInk};
  `,
}));
