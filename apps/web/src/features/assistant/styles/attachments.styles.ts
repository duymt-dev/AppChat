// Hàng tệp đính kèm phía trên ô soạn Trợ lý (TIP-023c 8c) — chip theo token, trạng thái tải / chuẩn bị / lỗi; khung xem lại ảnh chụp và
// đọc chính tả (TIP-023f §4).
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
  panel: css`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px;
    margin-bottom: 6px;
    border-radius: ${radius.r8}px;
    background: ${color.infoBg};
    font-size: ${font.scale.s12}px;
    color: ${color.text2};
  `,
  body: css`
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 4px;
    white-space: pre-wrap;
    word-break: break-word;
  `,
  actions: css`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  `,
  action: css`
    flex-shrink: 0;
    min-height: ${layout.chip}px;
    padding: 4px 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    background: ${color.surface};
    font-size: ${font.scale.s12}px;
    font-family: inherit;
    color: ${color.text};
    cursor: pointer;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  primary: css`
    border-color: ${color.brand};
    background: ${color.brand};
    color: ${color.white};
    font-weight: ${font.weight.semibold};
  `,
  shot: css`
    display: block;
    max-width: 100%;
    max-height: 160px;
    border-radius: ${radius.r6}px;
    border: 1px solid ${color.border};
  `,
  interim: css`
    color: ${color.text3};
    font-style: italic;
  `,
  edit: css`
    width: 100%;
    min-height: 60px;
    padding: 6px 8px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-family: inherit;
    font-size: ${font.scale.s13}px;
    color: ${color.text};
    resize: vertical;
  `,
}));
