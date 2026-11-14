// Drawer chi tiết báo giá (392px, nền xám) — prototype L5032–5160: đầu (mã, version, trạng thái, tổng, khách, nút gửi), 4 tab, chân thao tác.
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius } from '@appchat/ui';

export const useQuoteDetailStyles = createStyles(({ css, responsive }) => ({
  body: css`
    padding: 4px 8px;
  `,
  top: css`
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 12px;
    padding-right: 32px;
  `,
  icon: css`
    width: 54px;
    height: 54px;
    border-radius: ${radius.r12}px;
    background: ${gradient.ai};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  chips: css`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  `,
  code: css`
    font-family: ${font.mono};
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  rev: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    padding: 2px 8px;
    border-radius: ${radius.r6}px;
    background: ${color.mutedBg};
    color: ${color.text3};
  `,
  st: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    border-radius: ${radius.r6}px;
    padding: 2px 8px;
  `,
  total: css`
    font-size: ${font.scale.s22}px;
    font-weight: ${font.weight.heavy};
    color: ${color.brandInk};
    margin-top: 4px;
    letter-spacing: -0.01em;
  `,
  cust: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: ${color.bg};
    border: 1px solid ${color.mutedBg};
    border-radius: ${radius.r10}px;
    margin-bottom: 12px;
  `,
  av: css`
    width: 34px;
    height: 34px;
    border-radius: 50%;
    color: ${color.white};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.heavy};
    flex-shrink: 0;
  `,
  avLg: css`
    width: 44px;
    height: 44px;
    font-size: ${font.scale.s16}px;
  `,
  name: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  type: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    padding: 2px 6px;
    border-radius: ${radius.r6}px;
    margin-left: 2px;
  `,
  phone: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
    font-family: ${font.mono};
  `,
  byL: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    text-align: right;
  `,
  byV: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text2};
    text-align: right;
  `,
  sends: css`
    display: flex;
    gap: 6px;
  `,
  send: css`
    flex: 1;
    justify-content: center;
    display: flex;
    align-items: center;
    gap: 4px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    border-radius: ${radius.r8}px;
    height: 36px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    cursor: pointer;
    font-family: inherit;
    &:disabled {
      color: ${color.text4};
      cursor: not-allowed;
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  dot: css`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${color.zalo};
  `,
  foot: css`
    display: flex;
    gap: 8px;
    flex-wrap: nowrap;
    overflow: hidden;
    padding: 12px 20px;
    border-top: 1px solid ${color.border};
    background: ${color.surface};
    flex-shrink: 0;
  `,
  act: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 40px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    padding: 0 12px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    cursor: pointer;
    background: ${color.surface};
    font-family: inherit;
    line-height: 1.2;
    text-align: left;
    &:disabled {
      cursor: not-allowed;
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  actRev: css`
    color: ${color.amberText};
  `,
  actRej: css`
    color: ${color.rejectText};
  `,
  actContract: css`
    border-color: ${color.violet};
    background: ${color.violetBg};
    color: ${color.violet};
  `,
  actOrder: css`
    background: ${color.brand};
    border-color: ${color.brand};
    color: ${color.white};
    padding: 0 16px;
  `,
}));
