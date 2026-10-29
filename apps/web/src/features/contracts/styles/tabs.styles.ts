// Nội dung 5 tab drawer hợp đồng — prototype L5446–5484: thẻ trắng, dòng khoá–giá trị, lưới CRM, AI nhận định, tệp, timeline ký.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useContractTabStyles = createStyles(({ css, responsive }) => ({
  card: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    background: ${color.surface};
    padding: 16px;
    margin-bottom: 12px;
  `,
  flush: css`
    padding: 6px 0;
  `,
  h: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${color.text};
    margin-bottom: 12px;
  `,
  hTight: css`
    margin-bottom: 8px;
  `,
  hFiles: css`
    padding: 8px 16px 6px;
    margin-bottom: 0;
  `,
  kv: css`
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: ${font.scale.s14}px;
    padding: 6px 0;
    border-bottom: 1px solid ${color.divider};
    &:last-child {
      border-bottom: none;
    }
    span {
      color: ${color.text3};
      flex-shrink: 0;
    }
    b {
      color: ${color.text};
      font-weight: ${font.weight.semibold};
      text-align: right;
      min-width: 0;
      overflow-wrap: anywhere;
    }
  `,
  kvOther: css`
    span {
      color: ${color.text2};
    }
  `,
  green: css`
    && {
      color: ${color.brandInk};
      font-weight: ${font.weight.bold};
    }
  `,
  mono: css`
    && {
      font-family: ${font.mono};
      font-size: ${font.scale.s12}px;
    }
  `,
  btns: css`
    display: flex;
    gap: 8px;
  `,
  btn: css`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    border-radius: ${radius.r8}px;
    height: 40px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
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
  btnPrimary: css`
    background: ${color.brand};
    border-color: ${color.brand};
    color: ${color.white};
    font-weight: ${font.weight.bold};
  `,
  link: css`
    margin-top: 12px;
    padding: 8px 12px;
    border-radius: ${radius.r8}px;
    background: ${color.bg};
    border: 1px dashed ${color.checkLine};
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
    display: flex;
    align-items: center;
    gap: 8px;
    a {
      flex: 1;
      min-width: 0;
      font-family: ${font.mono};
      color: ${color.info};
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    button {
      border: none;
      background: transparent;
      color: ${color.brandInk};
      font-weight: ${font.weight.bold};
      cursor: pointer;
      font-family: inherit;
      font-size: ${font.scale.s12}px;
    }
  `,
  grid: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  `,
  gl: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  gv: css`
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  gvSm: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.bold};
  `,
  insight: css`
    display: flex;
    gap: 8px;
    padding: 12px;
    background: ${color.brandBg};
    border-radius: ${radius.r10}px;
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    line-height: 1.55;
  `,
  sugg: css`
    display: flex;
    flex-direction: column;
    gap: 6px;
    div {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: ${font.scale.s14}px;
      color: ${color.text2};
    }
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
  fName: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  fMeta: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    margin-top: 2px;
  `,
  open: css`
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
  `,
  tl: css`
    border-left: 2px solid ${color.border};
    padding-left: 16px;
    margin-left: 6px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  `,
  ev: css`
    position: relative;
  `,
  evDot: css`
    position: absolute;
    left: -24px;
    top: 2px;
    width: 11px;
    height: 11px;
    border-radius: 50%;
    border: 2px solid ${color.white};
    box-sizing: content-box;
  `,
  evT: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  evM: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
}));
