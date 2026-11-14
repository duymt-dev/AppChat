// Cột danh sách hội thoại — prototype L1629–1734 (320px; < md full width).
import { createStyles } from 'antd-style';
import { color, font, layout, radius, shadow } from '@appchat/ui';

export const useListStyles = createStyles(({ css, responsive }) => ({
  col: css`
    width: ${layout.inboxList}px;
    border-right: 1px solid ${color.border};
    background: ${color.surface};
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    min-width: 0;
    ${responsive.md} {
      width: 100%;
      border-right: none;
    }
  `,
  head: css`
    padding: 12px 12px 8px;
    border-bottom: 1px solid ${color.border};
    flex-shrink: 0;
  `,
  titleRow: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  `,
  title: css`
    font-weight: ${font.weight.bold};
    font-size: ${font.scale.s18}px;
    letter-spacing: -0.2px;
    color: ${color.text};
  `,
  sub: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  connect: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: ${color.brand};
    color: ${color.white};
    font-weight: ${font.weight.bold};
    font-size: ${font.scale.s14}px;
    height: 36px;
    padding: 0 12px;
    border-radius: ${radius.r8}px;
    cursor: pointer;
    white-space: nowrap;
    border: none;
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  search: css`
    position: relative;
    margin-bottom: 8px;
  `,
  searchIcon: css`
    position: absolute;
    left: 8px;
    top: 12px;
  `,
  searchBox: css`
    width: 100%;
    height: 36px;
    border: 1px solid ${color.border};
    background: ${color.bg};
    border-radius: ${radius.r8}px;
    padding: 0 36px 0 32px;
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    color: ${color.text};
    outline: none;
    &::placeholder {
      color: ${color.text4};
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  kbd: css`
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    font-family: ${font.mono};
    font-size: ${font.scale.s11}px;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r4}px;
    padding: 2px 4px;
    color: ${color.text4};
  `,
  chips: css`
    display: flex;
    gap: 6px;
    overflow-x: auto;
    margin-bottom: 8px;
    padding-bottom: 4px;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
  `,
  chipsLast: css`
    margin-bottom: 0;
  `,
  chip: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 36px;
    padding: 0 12px;
    border-radius: ${radius.r16}px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    white-space: nowrap;
    flex-shrink: 0;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text3};
    cursor: pointer;
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  chipIcon: css`
    padding-left: 6px;
  `,
  chipOn: css`
    border-color: transparent;
    background: ${color.text};
    color: ${color.white};
  `,
  chipCount: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    opacity: 0.7;
  `,
  chBadge: css`
    width: 18px;
    height: 18px;
    border-radius: ${radius.r4}px;
    display: grid;
    place-items: center;
    color: ${color.white};
    font-size: ${font.scale.s10}px;
    font-weight: ${font.weight.heavy};
    flex-shrink: 0;
  `,
  chBadge20: css`
    width: 20px;
    height: 20px;
  `,
  acct: css`
    position: relative;
    margin-bottom: 8px;
  `,
  acctBtn: css`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: ${radius.r8}px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    cursor: pointer;
    font-family: inherit;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text3};
    text-align: left;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  acctPop: css`
    position: absolute;
    top: 40px;
    left: 0;
    right: 0;
    max-height: 300px;
    overflow-y: auto;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    box-shadow: ${shadow.dropdown};
    padding: 6px;
    z-index: 31;
  `,
  acctRow: css`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: ${radius.r8}px;
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
  acctAll: css`
    padding: 8px;
  `,
  acctAllName: css`
    flex: none;
    font-weight: ${font.weight.bold};
    margin-right: auto;
  `,
  acctName: css`
    flex: 1;
    min-width: 0;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  acctCount: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  sep: css`
    height: 1px;
    background: ${color.divider};
    margin: 4px 2px;
  `,
  scroll: css`
    flex: 1;
    overflow-y: auto;
    scrollbar-width: thin;
  `,
  empty: css`
    padding: 48px 24px;
    text-align: center;
    color: ${color.text4};
    font-size: ${font.scale.s14}px;
  `,
  emptyIcon: css`
    margin: 0 auto;
  `,
  emptyTitle: css`
    font-size: ${font.scale.s16}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    margin: 12px 0 4px;
  `,
}));
