// Hàng thư mục Dữ liệu RAG + nút sửa (TIP-020b — KbFolderEditor): nút 28 hiện khi rê / focus, luôn hiện + vùng chạm 44 trên cảm ứng.
import { createStyles } from 'antd-style';
import { color, mq, radius } from '@appchat/ui';

export const useRagFolderStyles = createStyles(({ css }) => ({
  /** TIP-020b: hàng thư mục + nút sửa (hiện khi rê / focus; luôn hiện trên cảm ứng). */
  folderRow: css`
    position: relative;
    display: flex;
    align-items: center;
    &:hover > button:last-child,
    &:focus-within > button:last-child {
      opacity: 1;
    }
  `,
  folderEdit: css`
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: ${radius.r6}px;
    background: transparent;
    color: ${color.text4};
    cursor: pointer;
    opacity: 0;
    &:hover {
      background: ${color.divider};
      color: ${color.text2};
    }
    ${mq.noHover} {
      opacity: 1;
      width: 44px;
      height: 44px;
    }
  `,
}));
