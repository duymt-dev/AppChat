// Panel "Trợ lý AI · Lịch hẹn" — prototype L4157–4184: lời chào (bot tối), 4 thẻ gợi ý, ô nhập + "Mở Trợ lý AI đầy đủ".
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useCalAiStyles = createStyles(({ css, responsive }) => ({
  body: css`
    padding: 16px;
  `,
  hello: css`
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  `,
  bot: css`
    width: 30px;
    height: 30px;
    border-radius: ${radius.r8}px;
    background: ${color.text};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  bubble: css`
    background: ${color.bg};
    border: 1px solid ${color.divider};
    border-radius: ${radius.r12}px;
    padding: 12px;
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    line-height: 1.55;
  `,
  list: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  card: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 12px;
    cursor: pointer;
    text-align: left;
    background: ${color.surface};
    font-family: inherit;
    &:hover {
      background: ${color.bg};
    }
  `,
  cardH: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  cardIc: css`
    width: 28px;
    height: 28px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  cardD: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    line-height: 1.5;
  `,
  result: css`
    margin-top: 12px;
    background: ${color.brandBg};
    border-radius: ${radius.r10}px;
    padding: 12px;
    font-size: ${font.scale.s13}px;
    color: ${color.brandInk};
    font-weight: ${font.weight.semibold};
  `,
  foot: css`
    padding: 12px 16px;
    border-top: 1px solid ${color.divider};
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  box: css`
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 6px 6px 6px 12px;
    input {
      flex: 1;
      border: none;
      outline: none;
      font-family: inherit;
      font-size: ${font.scale.s14}px;
      color: ${color.text};
      background: transparent;
    }
  `,
  send: css`
    width: 34px;
    height: 34px;
    border: none;
    border-radius: ${radius.r8}px;
    background: ${color.brand};
    display: grid;
    place-items: center;
    cursor: pointer;
    flex-shrink: 0;
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  full: css`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
    cursor: pointer;
    padding: 2px;
    border: none;
    background: none;
    font-family: inherit;
  `,
}));
