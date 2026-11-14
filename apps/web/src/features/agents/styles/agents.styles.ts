// Màn AI Agents — tiêu đề, thư viện mẫu (lọc + lưới 5 cột + phân trang), "Agent của bạn" — prototype L2227–2289.
import { createStyles } from 'antd-style';
import { color, font, layout, mq, radius, shadow } from '@appchat/ui';

export const useAgentsStyles = createStyles(({ css, responsive }) => ({
  page: css`
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    ${responsive.md} {
      padding: 12px;
    }
  `,
  head: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  `,
  title: css`
    font-size: ${font.scale.s24}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: -0.02em;
    color: ${color.text};
  `,
  sub: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
    ${responsive.md} {
      display: none;
    }
  `,
  grow: css`
    flex: 1;
  `,
  btn: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: ${layout.chip}px;
    padding: 0 12px;
    border-radius: ${radius.r8}px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text};
    font-weight: ${font.weight.bold};
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
    line-height: 1;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  secHead: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  `,
  secTitle: css`
    font-size: ${font.scale.s16}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  hint: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    ${responsive.md} {
      display: none;
    }
  `,
  secSub: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    margin-bottom: 12px;
  `,
  filters: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    ${responsive.md} {
      flex-wrap: wrap;
    }
  `,
  search: css`
    display: flex;
    align-items: center;
    gap: 8px;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    height: ${layout.chip}px;
    padding: 0 12px;
    width: 340px;
    box-sizing: border-box;
    input {
      border: none;
      outline: none;
      flex: 1;
      min-width: 0;
      font-size: ${font.scale.s13}px;
      font-family: inherit;
      color: ${color.text};
      background: transparent;
    }
    ${responsive.md} {
      width: 100%;
      height: ${layout.touch}px;
    }
  `,
  select: css`
    height: ${layout.chip}px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 0 8px;
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    color: ${color.text};
    background: ${color.surface};
    cursor: pointer;
    outline: none;
    min-width: 180px;
    box-sizing: border-box;
    ${responsive.md} {
      min-width: 0;
      flex: 1 1 100%;
      height: ${layout.touch}px;
    }
  `,
  clear: css`
    display: inline-flex;
    align-items: center;
    height: ${layout.chip}px;
    padding: 0 12px;
    border-radius: ${radius.r8}px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
    cursor: pointer;
    white-space: nowrap;
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  grid: css`
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
    margin-bottom: 20px;
    ${mq.max1100} {
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  card: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 12px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 8px;
    text-align: left;
    font-family: inherit;
    &:hover {
      border-color: ${color.brand};
      box-shadow: ${shadow.hoverCard};
    }
  `,
  cardHead: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  cardIcon: css`
    width: 30px;
    height: 30px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  cardName: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  cardDesc: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    line-height: 1.5;
  `,
  cardFoot: css`
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 2px;
  `,
  tag: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    border-radius: ${radius.pill}px;
    padding: 2px 8px;
    white-space: nowrap;
  `,
  install: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.brand};
  `,
  pager: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 0 4px;
    flex-wrap: wrap;
  `,
  pgInfo: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
  `,
  pg: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 34px;
    height: 34px;
    padding: 0 8px;
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text3};
    font-family: inherit;
    &:disabled {
      color: ${color.checkLine};
      cursor: default;
    }
    ${responsive.md} {
      min-width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  pgArrow: css`
    color: ${color.text};
  `,
  pgOn: css`
    border-color: ${color.brand};
    background: ${color.brandBg};
    color: ${color.brandInk};
  `,
  empty: css`
    padding: 32px 0;
    text-align: center;
    color: ${color.text4};
    font-size: ${font.scale.s14}px;
    grid-column: 1 / -1;
  `,
}));
