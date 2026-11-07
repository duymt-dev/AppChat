// Modal "Gửi email" dùng chung — prototype L760–776 (600px, 1 cột, viền xám bo 9).
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useEmailComposeStyles = createStyles(({ css, responsive }) => ({
  field: css`
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
  `,
  label: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text2};
  `,
  input: css`
    width: 100%;
    height: 40px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    padding: 0 12px;
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
    background: ${color.surface};
    color: ${color.text};
    &:focus {
      border-color: ${color.brand};
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  body: css`
    height: 170px;
    padding: 8px 12px;
    resize: vertical;
    line-height: 1.55;
  `,
  btn: css`
    display: inline-flex;
    align-items: center;
    height: 36px;
    padding: 0 16px;
    border-radius: ${radius.r10}px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text2};
    cursor: pointer;
    font-family: inherit;
  `,
  primary: css`
    border: none;
    background: ${color.brand};
    color: ${color.white};
  `,
}));
