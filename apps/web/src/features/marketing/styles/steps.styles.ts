// Bước 2–4 wizard — prototype L3704–3780: thanh tìm + Upload Excel, nhóm lọc, bảng khách (24 1.5fr 1fr 1.6fr 1fr 90), thanh đã chọn,
// thẻ AI soạn (3 giọng), trình soạn có thanh công cụ, 3 lựa chọn lịch gửi + tóm tắt.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

const clip = `
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const GRID = '24px 1.5fr 1fr 1.6fr 1fr 90px';

export const useStepStyles = createStyles(({ css, responsive }) => ({
  tools: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  `,
  search: css`
    position: relative;
    flex: 1;
    min-width: 200px;
    svg {
      position: absolute;
      left: 12px;
      top: 12px;
    }
    input {
      width: 100%;
      height: 38px;
      padding-left: 32px;
      border: 1px solid ${color.border};
      border-radius: ${radius.r8}px;
      font-size: ${font.scale.s14}px;
      font-family: inherit;
      outline: none;
      box-sizing: border-box;
    }
    ${responsive.md} {
      input {
        height: ${layout.touch}px;
      }
      svg {
        top: 15px;
      }
    }
  `,
  upload: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 38px;
    padding: 0 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.blue};
    background: ${color.surface};
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  groups: css`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  `,
  group: css`
    display: inline-flex;
    align-items: center;
    padding: 6px 12px;
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    cursor: pointer;
    white-space: nowrap;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text3};
    font-family: inherit;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  groupOn: css`
    font-weight: ${font.weight.bold};
    border-color: ${color.brand};
    background: ${color.mkBrandSoft2};
    color: ${color.brandInk};
  `,
  done: css`
    border: 1px solid ${color.brand};
    border-radius: ${radius.r10}px;
    background: ${color.mkBrandSoft};
    padding: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    font-size: ${font.scale.s14}px;
    color: ${color.text};
  `,
  doneIc: css`
    width: 32px;
    height: 32px;
    border-radius: ${radius.r8}px;
    background: ${color.brand};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  doneS: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
  `,
  link: css`
    border: none;
    background: none;
    font-family: inherit;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
    cursor: pointer;
  `,
  allRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  `,
  all: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    cursor: pointer;
    padding: 4px 8px;
    border-radius: ${radius.r6}px;
    border: none;
    background: none;
    font-family: inherit;
  `,
  muted: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
  `,
  table: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    overflow: hidden;
  `,
  thead: css`
    display: grid;
    grid-template-columns: ${GRID};
    gap: 8px;
    padding: 8px 12px;
    background: ${color.rowHover};
    border-bottom: 1px solid ${color.divider};
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${color.text4};
    ${responsive.md} {
      display: none;
    }
  `,
  scroll: css`
    max-height: 300px;
    overflow-y: auto;
  `,
  row: css`
    display: grid;
    grid-template-columns: ${GRID};
    gap: 8px;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid ${color.dividerSoft};
    background: ${color.surface};
    cursor: pointer;
    ${responsive.md} {
      grid-template-columns: 24px 1fr auto;
      min-height: ${layout.touch}px;
    }
  `,
  rowOn: css`
    background: ${color.mkBrandSoft};
  `,
  check: css`
    width: 18px;
    height: 18px;
    border-radius: ${radius.r4}px;
    border: 2px solid ${color.mkCheckLine};
    background: ${color.surface};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  checkOn: css`
    border-color: ${color.brand};
    background: ${color.brand};
  `,
  who: css`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  `,
  av: css`
    width: 30px;
    height: 30px;
    border-radius: 50%;
    color: ${color.white};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.heavy};
    flex-shrink: 0;
  `,
  nm: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    ${clip}
  `,
  ph: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
    font-family: ${font.mono};
    white-space: nowrap;
    ${responsive.md} {
      display: none;
    }
  `,
  em: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    ${clip}
    ${responsive.md} {
      display: none;
    }
  `,
  meta: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
    ${clip}
    ${responsive.md} {
      display: none;
    }
  `,
  grp: css`
    justify-self: end;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    padding: 2px 8px;
    border-radius: ${radius.r10}px;
    white-space: nowrap;
  `,
  empty: css`
    text-align: center;
    padding: 32px 0;
    color: ${color.text4};
    font-size: ${font.scale.s14}px;
  `,
  picked: css`
    margin-top: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
    background: ${color.forestDeep};
    border-radius: ${radius.r12}px;
    padding: 12px 16px;
    flex-wrap: wrap;
  `,
  pIc: css`
    width: 30px;
    height: 30px;
    border-radius: ${radius.r8}px;
    background: ${color.mkGlass};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  pT: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.heavy};
    color: ${color.white};
  `,
  pS: css`
    font-size: ${font.scale.s13}px;
    color: ${color.mkWhite60};
  `,
}));
