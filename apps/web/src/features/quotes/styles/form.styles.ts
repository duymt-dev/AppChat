// Modal "Tạo báo giá" — prototype L5189–5228 (720px, nhóm trường 2 cột, khối "Chi tiết sản phẩm" viền đứt) + modal AI soạn nháp.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useQuoteFormStyles = createStyles(({ css, responsive }) => ({
  section: css`
    margin-bottom: 20px;
  `,
  sectionTitle: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: ${color.text4};
    margin-bottom: 8px;
  `,
  grid: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  wide: css`
    grid-column: 1 / -1;
  `,
  field: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
  `,
  label: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
  `,
  input: css`
    width: 100%;
    height: 38px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 0 12px;
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
    background: ${color.surface};
    color: ${color.text};
    &:focus {
      border-color: ${color.brand};
    }
    &:disabled {
      background: ${color.rowHover};
      color: ${color.text3};
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  area: css`
    height: 76px;
    padding: 8px 12px;
    resize: none;
    line-height: 1.5;
  `,
  box: css`
    border: 1px dashed ${color.checkLine};
    border-radius: ${radius.r10}px;
    padding: 12px;
    background: ${color.tabIdle};
  `,
  hint: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    margin-bottom: 8px;
  `,
  addLine: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 0 12px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    background: ${color.surface};
    cursor: pointer;
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  rows: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 8px;
  `,
  row: css`
    display: grid;
    grid-template-columns: 1fr 56px 104px 56px 64px 96px 32px;
    gap: 6px;
    align-items: center;
    ${responsive.md} {
      grid-template-columns: 1fr 56px 96px 32px;
    }
  `,
  cell: css`
    height: 32px;
    padding: 0 8px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r6}px;
    font-size: ${font.scale.s13}px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    background: ${color.surface};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  num: css`
    text-align: right;
  `,
  mHide: css`
    ${responsive.md} {
      display: none;
    }
  `,
  amount: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    text-align: right;
  `,
  del: css`
    width: 28px;
    height: 28px;
    border-radius: ${radius.r6}px;
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
  boxFoot: css`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  `,
  grow: css`
    flex: 1;
  `,
  pct: css`
    width: 64px;
  `,
  warn: css`
    display: flex;
    align-items: center;
    gap: 8px;
    background: ${color.warnSoftBg};
    border: 1px solid ${color.noticeLine};
    border-radius: ${radius.r10}px;
    padding: 8px 12px;
    font-size: ${font.scale.s13}px;
    color: ${color.pendingText};
    margin-bottom: 12px;
  `,
  err: css`
    background: ${color.dangerSoftBg};
    border: 1px solid ${color.dangerLine};
    color: ${color.hotText};
    border-radius: ${radius.r8}px;
    padding: 8px 12px;
    font-size: ${font.scale.s13}px;
    margin-bottom: 12px;
  `,
  btn: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 40px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 0 16px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text2};
    cursor: pointer;
    background: ${color.surface};
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  primary: css`
    background: ${color.brand};
    border-color: ${color.brand};
    color: ${color.white};
    font-weight: ${font.weight.bold};
  `,
}));
