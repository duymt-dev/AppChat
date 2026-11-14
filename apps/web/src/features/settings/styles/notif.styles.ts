// Mục Thông báo — prototype L6201–6215: bảng 2.5fr / 80 / 80 / 80 (header + dòng nhóm in hoa 12 nền FAFBFB), công tắc 38×22 giữa ô;
// thẻ "Tuỳ chọn nhận thông báo" (tiêu đề 15 đậm), hàng 12/20 viền dưới, giờ DND ô time 32, select 36.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useNotifStyles = createStyles(({ css, responsive }) => ({
  table: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    overflow: hidden;
    margin-bottom: 16px;
  `,
  grid: css`
    display: grid;
    grid-template-columns: 2.5fr 80px 80px 80px;
    gap: 12px;
    padding: 12px 20px;
    align-items: center;
    ${responsive.md} {
      grid-template-columns: 1fr ${layout.touch}px ${layout.touch}px ${layout.touch}px;
      gap: 4px;
      padding: 8px 12px;
    }
  `,
  th: css`
    background: ${color.auditHead};
    border-bottom: 1px solid ${color.divider};
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${color.text4};
    ${responsive.md} {
      font-size: ${font.scale.s10}px;
      letter-spacing: 0;
    }
  `,
  g: css`
    padding: 8px 20px;
    background: ${color.auditHead};
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
    text-transform: uppercase;
    letter-spacing: 0.04em;
    ${responsive.md} {
      padding: 8px 12px;
    }
  `,
  tr: css`
    border-bottom: 1px solid ${color.divider};
  `,
  l: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text};
  `,
  c: css`
    text-align: center;
  `,
  cFlex: css`
    display: flex;
    justify-content: center;
  `,
  box: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    overflow: hidden;
  `,
  boxT: css`
    padding: 12px 20px;
    border-bottom: 1px solid ${color.divider};
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  opt: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    border-bottom: 1px solid ${color.divider};
    ${responsive.md} {
      padding: 12px;
      flex-wrap: wrap;
    }
  `,
  optTop: css`
    align-items: flex-start;
  `,
  optLast: css`
    border-bottom: none;
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  oT: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  oS: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
    margin-top: 2px;
  `,
  dnd: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
  `,
  time: css`
    height: 32px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    padding: 0 8px;
    color: ${color.text};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  select: css`
    height: 36px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    background: ${color.surface};
    padding: 0 12px;
    cursor: pointer;
    color: ${color.text2};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
}));
