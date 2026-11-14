// Panel "Trợ lý AI · Báo giá" (380px) — prototype L5168–5186: đầu gradient, lời chào, 4 gợi ý nghiệp vụ, kết quả, ô hỏi.
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius } from '@appchat/ui';

export const useQuoteAiStyles = createStyles(({ css, responsive }) => ({
  intro: css`
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  `,
  bot: css`
    width: 28px;
    height: 28px;
    border-radius: ${radius.r8}px;
    background: ${color.text};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  bubble: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r4}px ${radius.r12}px ${radius.r12}px ${radius.r12}px;
    padding: 12px;
    font-size: ${font.scale.s14}px;
    line-height: 1.55;
    color: ${color.text};
  `,
  group: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${color.text4};
    padding: 2px 2px 6px;
  `,
  list: css`
    display: flex;
    flex-direction: column;
    gap: 6px;
  `,
  run: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    background: ${color.surface};
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    width: 100%;
  `,
  runIc: css`
    width: 28px;
    height: 28px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  runL: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  runD: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  result: css`
    margin-top: 12px;
    background: ${color.surface};
    border: 1px solid ${color.aiResultLine};
    border-radius: ${radius.r12}px;
    padding: 12px;
    font-size: ${font.scale.s14}px;
    line-height: 1.6;
    color: ${color.text};
  `,
  thread: css`
    margin-top: 12px;
  `,
  resultH: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.heavy};
    color: ${color.violet};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 6px;
  `,
  foot: css`
    padding: 12px;
    border-top: 1px solid ${color.border};
    display: flex;
    align-items: center;
    gap: 8px;
    background: ${color.surface};
  `,
  box: css`
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1.5px solid ${color.violet};
    border-radius: ${radius.r12}px;
    padding: 6px 6px 6px 12px;
    input {
      flex: 1;
      border: none;
      outline: none;
      font-size: ${font.scale.s14}px;
      font-family: inherit;
      background: transparent;
      min-width: 0;
    }
  `,
  send: css`
    width: 32px;
    height: 32px;
    border-radius: ${radius.r8}px;
    background: ${color.violet};
    display: grid;
    place-items: center;
    cursor: pointer;
    flex-shrink: 0;
    border: none;
    padding: 0;
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  headIc: css`
    background: ${gradient.quoteAiIcon};
  `,
}));
