// Trình soạn + phần xem mô tả sản phẩm (TIP-027b) — prototype L4134: khung viền, thanh 5 nút nền xám, vùng soạn 96px. Tách khỏi form.styles.
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

export const useDescriptionStyles = createStyles(({ css }) => ({
  rt: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    overflow: hidden;
    &:focus-within {
      border-color: ${color.brand};
    }
  `,
  rtBar: css`
    display: flex;
    gap: 2px;
    padding: 4px 6px;
    border-bottom: 1px solid ${color.pillBg};
    background: ${color.rowHover};
  `,
  rtBtn: css`
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    border-radius: ${radius.r6}px;
    cursor: pointer;
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    font-family: inherit;
    &:focus-visible {
      outline: 2px solid ${color.brand};
    }
  `,
  rtOn: css`
    background: ${color.brandBg};
    color: ${color.brandInk};
  `,
  rtArea: css`
    width: 100%;
    min-height: 96px;
    max-height: 320px;
    overflow-y: auto;
    padding: 8px 12px;
    font-size: ${font.scale.s14}px;
    line-height: 1.55;
    color: ${color.text};
    outline: none;
    border: none;
    font-family: inherit;
    display: block;
    box-sizing: border-box;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  `,
  rtLine: css`
    min-height: 1.55em;
  `,
  rtItem: css`
    display: flex;
    gap: 6px;
    padding-left: 8px;
  `,
  rtMarker: css`
    color: ${color.text3};
    user-select: none;
    flex: none;
  `,
  rtBold: css`
    font-weight: ${font.weight.heavy};
  `,
  rtItalic: css`
    font-style: italic;
    font-family: Georgia, serif;
  `,
  rtUnder: css`
    text-decoration: underline;
  `,
  rtSmall: css`
    font-size: ${font.scale.s12}px;
  `,
  view: css`
    font-size: ${font.scale.s14}px;
    line-height: 1.55;
    color: ${color.text};
    overflow-wrap: anywhere;
    p {
      margin: 0 0 4px;
      min-height: 1em;
    }
    ul,
    ol {
      margin: 0 0 4px;
      padding-left: 20px;
    }
  `,
}));
