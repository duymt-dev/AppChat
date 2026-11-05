// Trình duyệt phiên (SessionBrowser — TIP-023c G2.8a): ô tìm + danh sách phiên (tiêu đề, chế độ, thời điểm) + tải thêm.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useSessionStyles = createStyles(({ css, responsive }) => ({
  /** Nút "Lịch sử" trên thanh Trợ lý — gọn để thanh giữ đúng chiều cao prototype ở màn chào (PD-009); mobile ≥ 44px. */
  open: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    border: 0;
    border-radius: ${radius.r8}px;
    background: none;
    color: ${color.text3};
    font-family: inherit;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    cursor: pointer;
    &:hover {
      background: ${color.rowHover};
      color: ${color.text};
    }
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  body: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  search: css`
    width: 100%;
    min-height: ${layout.chip}px;
    padding: 8px 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-family: inherit;
    font-size: ${font.scale.s14}px;
    color: ${color.text};
    outline: none;
    &:focus {
      border-color: ${color.brand};
    }
  `,
  list: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
  `,
  row: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 100%;
    min-height: ${layout.touch}px;
    padding: 8px 12px;
    border: 1px solid transparent;
    border-radius: ${radius.r8}px;
    background: ${color.surface};
    text-align: left;
    font-family: inherit;
    cursor: pointer;
    &:hover,
    &:focus-visible {
      background: ${color.rowHover};
      border-color: ${color.border};
    }
  `,
  active: css`
    border-color: ${color.brand};
    background: ${color.brandBgSoft};
  `,
  title: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  meta: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
  `,
  more: css`
    align-self: center;
    padding: 6px 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    background: ${color.surface};
    color: ${color.text2};
    font-family: inherit;
    font-size: ${font.scale.s13}px;
    cursor: pointer;
  `,
  muted: css`
    padding: 24px 8px;
    text-align: center;
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
  `,
}));
