// Hộp form Cài đặt — prototype L7643–7660: nền mờ, hộp 460 bo 16, đầu 16/20 viền dưới, thân 20, chân 12/20 nút cao 38.
import { createStyles } from 'antd-style';
import { color, font, layout, radius, shadow, z } from '@appchat/ui';

const btn = `
  display: inline-flex;
  align-items: center;
  height: 38px;
  padding: 0 16px;
  border-radius: ${radius.r8}px;
  font-size: ${font.scale.s14}px;
  font-family: inherit;
  cursor: pointer;
`;

export const useFormModalStyles = createStyles(({ css, responsive }) => ({
  veil: css`
    position: fixed;
    inset: 0;
    z-index: ${z.mkModal};
    background: ${color.modalVeilSoft};
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 28px;
    ${responsive.md} {
      padding: 0;
      /* Toàn màn trên mobile: phủ thanh tab (nút Lưu ở đáy) nhưng vẫn dưới dropdown / hộp xác nhận antd (≥ 1000). */
      z-index: ${z.tabbar + 1};
    }
  `,
  box: css`
    width: 460px;
    max-width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    background: ${color.surface};
    border-radius: ${radius.r16}px;
    box-shadow: ${shadow.dock};
    overflow: hidden;
    font-family: ${font.family};
    line-height: normal;
    ${responsive.md} {
      width: 100%;
      height: 100%;
      max-height: 100dvh;
      border-radius: 0;
    }
  `,
  wide: css`
    && {
      width: 560px;
    }
  `,
  head: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px 20px;
    border-bottom: 1px solid ${color.divider};
  `,
  title: css`
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  grow: css`
    flex: 1;
  `,
  x: css`
    width: 30px;
    height: 30px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    cursor: pointer;
    border: none;
    background: transparent;
    padding: 0;
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  body: css`
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
    flex: 1;
  `,
  foot: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    border-top: 1px solid ${color.divider};
  `,
  ghost: css`
    ${btn}
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text};
    font-weight: ${font.weight.semibold};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  primary: css`
    ${btn}
    border: none;
    background: ${color.brand};
    color: ${color.white};
    font-weight: ${font.weight.bold};
    &:disabled {
      opacity: 0.6;
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
}));
