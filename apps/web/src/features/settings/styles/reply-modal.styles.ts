// Hộp câu trả lời mẫu — prototype L7510–7516: hàng Nhóm (1.4) + Shortcut (1, mono), nội dung 5 dòng bo 8, dòng "Biến:" chip code xám.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

const field = `
  width: 100%;
  padding: 0 12px;
  border: 1px solid ${color.border};
  border-radius: ${radius.r8}px;
  font-size: ${font.scale.s14}px;
  outline: none;
  box-sizing: border-box;
  background: ${color.surface};
  color: ${color.text};
`;

export const useReplyModalStyles = createStyles(({ css, responsive }) => ({
  two: css`
    display: flex;
    gap: 12px;
    ${responsive.md} {
      flex-direction: column;
    }
  `,
  cat: css`
    flex: 1.4;
    min-width: 0;
  `,
  mono: css`
    ${field}
    height: 38px;
    font-family: ${font.mono};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  body: css`
    ${field}
    padding: 8px 12px;
    font-family: inherit;
    resize: vertical;
    line-height: 1.55;
  `,
  vars: css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    margin-top: 4px;
  `,
  v: css`
    background: ${color.divider};
    padding: 2px 4px;
    border-radius: ${radius.r4}px;
    border: none;
    font-family: ${font.mono};
    font-size: ${font.scale.s12}px;
    color: ${color.text2};
    cursor: pointer;
  `,
}));
