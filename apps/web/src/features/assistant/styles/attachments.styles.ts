// Hàng tệp đính kèm phía trên ô soạn Trợ lý (TIP-023c 8c) — chip theo token, trạng thái tải / lỗi.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useAttachmentStyles = createStyles(({ css, responsive }) => ({
  row: css`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 4px 0 6px;
  `,
  chip: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 260px;
    min-height: ${layout.chip}px;
    padding: 4px 8px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    background: ${color.bg};
    font-size: ${font.scale.s12}px;
    color: ${color.text};
  `,
  chipError: css`
    border-color: ${color.danger};
    color: ${color.danger};
  `,
  name: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  `,
  state: css`
    color: ${color.text3};
    flex: none;
  `,
  btn: css`
    border: none;
    background: transparent;
    padding: 0;
    cursor: pointer;
    color: inherit;
    font: inherit;
    display: inline-flex;
    align-items: center;
    ${responsive.md} {
      min-height: ${layout.touch}px;
      min-width: ${layout.touch}px;
      justify-content: center;
    }
  `,
  link: css`
    text-decoration: underline;
  `,
}));
