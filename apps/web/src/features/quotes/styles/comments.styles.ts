// Khối "Trao đổi nội bộ" của drawer báo giá — prototype L5122–5127 (avatar 26, tên + giờ, ô nhập + nút gửi đen).
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useCommentStyles = createStyles(({ css, responsive }) => ({
  cmts: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
  `,
  cmt: css`
    display: flex;
    gap: 8px;
  `,
  cmtAv: css`
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: ${color.commentAvatar};
    color: ${color.text2};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.heavy};
    flex-shrink: 0;
    overflow: hidden;
  `,
  cmtWho: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    margin-right: 6px;
  `,
  cmtAt: css`
    font-size: ${font.scale.s11}px;
    color: ${color.text4};
  `,
  cmtText: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    line-height: 1.5;
    margin-top: 2px;
  `,
  composer: css`
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    padding: 4px 4px 4px 12px;
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
  sendBtn: css`
    width: 30px;
    height: 30px;
    border-radius: ${radius.r8}px;
    background: ${color.text};
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
}));
