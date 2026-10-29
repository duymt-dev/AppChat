// Panel "Trợ lý AI · Hợp đồng" (400px) — prototype L5413–5428: Nghiệp vụ nhanh (4 dòng), kết quả, ô hỏi.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useContractAiStyles = createStyles(({ css, responsive }) => ({
  body: css`
    padding: 16px;
  `,
  group: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: ${color.text4};
    margin-bottom: 8px;
  `,
  list: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  `,
  run: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    cursor: pointer;
    background: ${color.surface};
    font-family: inherit;
    text-align: left;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  runIc: css`
    width: 30px;
    height: 30px;
    border-radius: ${radius.r8}px;
    background: ${color.brandBg};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  result: css`
    background: ${color.bg};
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    padding: 12px;
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    line-height: 1.55;
  `,
  foot: css`
    padding: 12px 16px;
    border-top: 1px solid ${color.divider};
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
      background: transparent;
      color: ${color.text};
      min-width: 0;
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
}));
