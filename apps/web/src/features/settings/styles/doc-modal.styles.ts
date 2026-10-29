// Hộp mẫu chứng từ (D30 — màn mới; khung FormModal rộng + pattern Cài đặt): bước wizard (chấm số), vùng thả file (như hộp tải RAG),
// bảng gán biến (placeholder → select biến, % tin cậy), chip biến chèn vào thân mẫu, bảng kiểm pháp lý (cảnh báo vàng, không chặn).
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useDocModalStyles = createStyles(({ css, responsive }) => ({
  steps: css`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  `,
  step: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text4};
    span {
      width: 22px;
      height: 22px;
      border-radius: ${radius.pill}px;
      display: grid;
      place-items: center;
      background: ${color.muteBg};
      font-size: ${font.scale.s12}px;
      font-weight: ${font.weight.bold};
    }
  `,
  stepOn: css`
    && {
      color: ${color.brandInk};
    }
    && span {
      background: ${color.brand};
      color: ${color.white};
    }
  `,
  drop: css`
    border: 1.5px dashed ${color.ragDrop};
    border-radius: ${radius.r12}px;
    padding: 24px;
    text-align: center;
    background: ${color.brandBgSoft};
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    line-height: 1.6;
  `,
  dropT: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    margin: 8px 0 4px;
  `,
  pick: css`
    display: inline-flex;
    align-items: center;
    height: 36px;
    padding: 0 16px;
    margin-top: 12px;
    border-radius: ${radius.r8}px;
    background: ${color.surface};
    border: 1px solid ${color.border};
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    cursor: pointer;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
    input {
      display: none;
    }
  `,
  err: css`
    font-size: ${font.scale.s13}px;
    color: ${color.dangerStrong};
  `,
  map: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    overflow: hidden;
  `,
  mapRow: css`
    display: grid;
    grid-template-columns: 1.3fr 1.3fr 64px 32px;
    gap: 8px;
    padding: 8px 12px;
    align-items: center;
    border-bottom: 1px solid ${color.divider};
    &:last-child {
      border-bottom: none;
    }
    ${responsive.md} {
      grid-template-columns: 1fr 64px 32px;
      & > :first-child {
        grid-column: 1 / -1;
      }
    }
  `,
  mapTh: css`
    background: ${color.auditHead};
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: ${color.text4};
  `,
  ph: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
    background: ${color.alertBg};
    border-radius: ${radius.r4}px;
    padding: 2px 6px;
    font-family: ${font.mono};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  conf: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    text-align: right;
  `,
  low: css`
    color: ${color.amberText};
  `,
  hi: css`
    color: ${color.okStrong};
  `,
  x: css`
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    border-radius: ${radius.r6}px;
    display: grid;
    place-items: center;
    cursor: pointer;
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  vars: css`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    button {
      height: 26px;
      padding: 0 8px;
      border-radius: ${radius.r6}px;
      border: 1px solid ${color.border};
      background: ${color.surface};
      font-size: ${font.scale.s12}px;
      font-family: ${font.mono};
      color: ${color.violet};
      cursor: pointer;
      ${responsive.md} {
        height: ${layout.touch}px;
      }
    }
  `,
  body: css`
    width: 100%;
    min-height: 200px;
    resize: vertical;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 12px;
    font-size: ${font.scale.s13}px;
    font-family: ${font.mono};
    color: ${color.text};
    line-height: 1.6;
    outline: none;
  `,
  lock: css`
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 8px 12px;
    border-radius: ${radius.r8}px;
    background: ${color.muteBg};
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
  `,
  check: css`
    border: 1px solid ${color.alertLine};
    background: ${color.alertBg};
    border-radius: ${radius.r12}px;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  `,
  checkT: css`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  checkN: css`
    margin-left: auto;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.okStrong};
  `,
  checkWarn: css`
    && {
      color: ${color.amberText};
    }
  `,
  checkRow: css`
    display: flex;
    gap: 8px;
    align-items: flex-start;
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
    svg {
      flex-shrink: 0;
      margin-top: 2px;
    }
  `,
  checkHint: css`
    font-size: ${font.scale.s12}px;
    color: ${color.alertText};
    margin-top: 4px;
  `,
  row2: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  check1: css`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
    cursor: pointer;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
}));
