// Thẻ trạng thái chỉ mục embedding (TIP-020e §4.2 — prototype không có, PD ghi ở DEVIATIONS): dải trên bảng tệp của Dữ liệu RAG; nền theo
// mức (cũ → cam nhạt, đang chạy → xanh dương nhạt, lỗi / suy giảm → đỏ nhạt), thanh tiến độ thật `done / expected`, nút hành động 32.
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

const btn = `
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: ${radius.r8}px;
  font-size: ${font.scale.s13}px;
  font-weight: ${font.weight.semibold};
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

export const useKbIndexStyles = createStyles(({ css, responsive }) => ({
  card: css`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 16px;
    margin-bottom: 16px;
    border-radius: ${radius.r12}px;
    border: 1px solid ${color.divider};
    background: ${color.white};
    ${responsive.md} {
      flex-wrap: wrap;
      padding: 12px;
    }
  `,
  stale: css`
    background: ${color.warnBg};
    border-color: ${color.warnBg};
  `,
  running: css`
    background: ${color.infoBg};
    border-color: ${color.infoBg};
  `,
  bad: css`
    background: ${color.dangerSoftBg};
    border-color: ${color.dangerBg};
  `,
  body: css`
    flex: 1;
    min-width: 0;
  `,
  title: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  text: css`
    margin-top: 2px;
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    overflow-wrap: anywhere;
  `,
  bar: css`
    margin-top: 8px;
    height: 6px;
    border-radius: ${radius.r8}px;
    background: ${color.divider};
    overflow: hidden;
  `,
  fill: css`
    height: 100%;
    background: ${color.info};
    transition: width 0.3s ease;
  `,
  acts: css`
    display: flex;
    gap: 8px;
    flex-shrink: 0;
    ${responsive.md} {
      width: 100%;
      button {
        flex: 1;
        justify-content: center;
        min-height: 44px;
      }
    }
  `,
  primary: css`
    ${btn}
    border: none;
    background: ${color.brand};
    color: ${color.white};
  `,
  ghost: css`
    ${btn}
    border: 1px solid ${color.divider};
    background: ${color.white};
    color: ${color.text2};
  `,
}));
