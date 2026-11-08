// Drawer chi tiết kết nối (TIP-012b P3) — cùng ngôn ngữ thẻ Cài đặt (ô thông tin 2 cột, pill trạng thái, danh sách log gọn).
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

export const useIntegDetailStyles = createStyles(({ css, responsive }) => ({
  body: css`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  `,
  grid: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 16px;
    ${responsive.sm} {
      grid-template-columns: 1fr;
    }
  `,
  k: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  v: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    overflow-wrap: anywhere;
  `,
  h: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.heavy};
    margin-bottom: 8px;
  `,
  pill: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    border-radius: ${radius.pill}px;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
  `,
  ok: css`
    background: ${color.brandBg};
    color: ${color.brandInk};
  `,
  warn: css`
    background: ${color.alertBg};
    color: ${color.amberText};
  `,
  bad: css`
    background: ${color.dangerBg};
    color: ${color.danger};
  `,
  idle: css`
    background: ${color.bg};
    color: ${color.text3};
  `,
  note: css`
    font-size: ${font.scale.s13}px;
    padding: 8px 12px;
    border-radius: ${radius.r8}px;
    background: ${color.alertBg};
    color: ${color.amberText};
  `,
  row: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    border-bottom: 1px solid ${color.border};
    font-size: ${font.scale.s13}px;
  `,
  op: css`
    flex: 1;
    min-width: 0;
    color: ${color.text};
  `,
  meta: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    white-space: nowrap;
  `,
  more: css`
    margin-top: 8px;
  `,
  foot: css`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  `,
  grow: css`
    flex: 1;
  `,
}));
