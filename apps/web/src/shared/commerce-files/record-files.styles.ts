// Tab Tệp của drawer đơn / đề nghị — prototype L5967–5978 (thẻ trắng, dòng tệp: ô đuôi màu 34×40 · tên · meta · "Mở", nút "+ Tải tệp lên"
// viền đứt). Thêm (TIP-032d §3.2): nút gỡ (chỉ tệp người dùng gắn), nhãn "chứng từ", trạng thái đang tải / lỗi / đã đổi. Mobile: chạm ≥ 44.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useRecordFilesStyles = createStyles(({ css, responsive }) => ({
  card: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    background: ${color.surface};
    padding: 6px 0;
    margin-bottom: 12px;
  `,
  h: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${color.text};
    padding: 8px 16px 6px;
  `,
  file: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px;
    border-top: 1px solid ${color.divider};
  `,
  ext: css`
    width: 34px;
    height: 40px;
    border-radius: ${radius.r6}px;
    display: grid;
    place-items: center;
    color: ${color.white};
    font-size: ${font.scale.s10}px;
    font-weight: ${font.weight.heavy};
    flex-shrink: 0;
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  name: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  meta: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    margin-top: 2px;
  `,
  btn: css`
    display: inline-flex;
    align-items: center;
    height: 28px;
    padding: 0 8px;
    border-radius: ${radius.r6}px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text2};
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    flex-shrink: 0;
    font-family: inherit;
    &:disabled {
      cursor: not-allowed;
      color: ${color.text4};
    }
    ${responsive.mobile} {
      min-height: ${layout.touch}px;
      min-width: ${layout.touch}px;
      justify-content: center;
    }
  `,
  danger: css`
    color: ${color.dangerDeep};
  `,
  upload: css`
    margin: 8px 16px;
    width: calc(100% - 32px);
    height: 34px;
    border: 1px dashed ${color.checkLine};
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
    cursor: pointer;
    background: transparent;
    font-family: inherit;
    &:disabled {
      cursor: progress;
      color: ${color.text4};
    }
    ${responsive.mobile} {
      height: ${layout.touch}px;
    }
  `,
  note: css`
    margin: 4px 16px 8px;
    font-size: ${font.scale.s12}px;
    color: ${color.text2};
  `,
  error: css`
    color: ${color.dangerDeep};
  `,
  empty: css`
    padding: 12px 16px;
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
    border-top: 1px solid ${color.divider};
  `,
}));
