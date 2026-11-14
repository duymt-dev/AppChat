// Cài đặt › Email Marketing — prototype L7033–7067: mô tả 14 xám, thanh nhà cung cấp (nút bo 10, logo 22), thẻ trắng viền 12 (padding
// 20, logo 38 bo 10, tiêu đề 18), danh sách hướng dẫn (số tròn 26), thẻ gợi ý gradient xanh — chỉ Brevo / SMTP có manifest (D28).
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

export const useEmailMktStyles = createStyles(({ css }) => ({
  lead: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
    margin-bottom: 12px;
  `,
  bar: css`
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  `,
  plat: css`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    min-height: 44px;
    border-radius: ${radius.r10}px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    cursor: pointer;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text3};
    font-family: inherit;
  `,
  platOn: css`
    font-weight: ${font.weight.bold};
  `,
  av: css`
    width: 22px;
    height: 22px;
    border-radius: ${radius.r6}px;
    color: ${color.white};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.heavy};
  `,
  card: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 20px;
    margin-bottom: 16px;
  `,
  head: css`
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  `,
  logo: css`
    width: 38px;
    height: 38px;
    border-radius: ${radius.r10}px;
    color: ${color.white};
    display: grid;
    place-items: center;
    font-weight: ${font.weight.heavy};
    font-size: ${font.scale.s18}px;
    flex-shrink: 0;
  `,
  t: css`
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  s: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  on: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    padding: 2px 12px;
    border-radius: ${radius.r12}px;
    background: ${color.brandBg};
    color: ${color.brandInk};
  `,
  steps: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 4px 16px 8px;
    margin-bottom: 16px;
  `,
  stepsT: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    padding: 12px 0;
  `,
  step: css`
    display: flex;
    gap: 12px;
    padding: 12px 0;
    border-top: 1px solid ${color.divider};
  `,
  n: css`
    width: 26px;
    height: 26px;
    border-radius: 50%;
    color: ${color.white};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.heavy};
    flex-shrink: 0;
  `,
  stepT: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  stepD: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    line-height: 1.5;
    margin-top: 2px;
  `,
  note: css`
    background: linear-gradient(135deg, ${color.brandBg}, ${color.lookupBg});
    border: 1px solid ${color.brandBorder};
    border-radius: ${radius.r12}px;
    padding: 16px;
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    line-height: 1.55;
  `,
  row: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 0;
    border-top: 1px solid ${color.divider};
    flex-wrap: wrap;
  `,
  mono: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
    word-break: break-all;
  `,
  pill: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    padding: 2px 8px;
    border-radius: ${radius.r12}px;
    white-space: nowrap;
  `,
  ok: css`
    background: ${color.brandBg};
    color: ${color.brandInk};
  `,
  warn: css`
    background: ${color.warnSoftBg};
    color: ${color.amberGold};
  `,
  muted: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
  `,
}));
