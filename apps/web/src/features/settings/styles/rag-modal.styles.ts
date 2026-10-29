// Hộp tải tài liệu RAG + ô tên thư mục — prototype L7487–7499: vùng thả viền đứt 2 bo 12 (icon 42 xanh nhạt), hàng "Cho AI học" công tắc.
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

export const useRagModalStyles = createStyles(({ css }) => ({
  prompt: css`
    width: 100%;
    height: 38px;
    padding: 0 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
    margin-top: 8px;
  `,
  drop: css`
    border: 2px dashed ${color.ragDrop};
    border-radius: ${radius.r12}px;
    background: ${color.bg};
    padding: 20px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    cursor: pointer;
    font-family: inherit;
    width: 100%;
  `,
  dropIc: css`
    width: 42px;
    height: 42px;
    border-radius: ${radius.r10}px;
    background: ${color.brandBg};
    display: grid;
    place-items: center;
    margin-bottom: 8px;
  `,
  dropT: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    b {
      color: ${color.brandInk};
    }
  `,
  dropS: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  learnRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 2px;
  `,
  learnT: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    font-weight: ${font.weight.semibold};
  `,
}));
