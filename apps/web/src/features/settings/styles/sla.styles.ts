// Mục Thiết lập SLA — prototype L7377–7416: nút "Tạo chính sách" 38, bảng lưới 9 cột (header 11 in hoa nền FAFBFB), thanh màu 4×30,
// AI tím / người đen; lưới 1.1fr 1fr: giờ làm việc (banner tím nhạt AI 24/7, chấm ngày 9, dòng nghỉ nền xám) + leo thang (chấm 8, công
// tắc) + thẻ tối "AI dự báo rủi ro SLA". Hộp sửa: lưới 2×2 ô phút.
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius } from '@appchat/ui';

const COLS = '1.8fr 1.4fr 1fr 0.9fr 0.9fr 0.9fr 0.9fr 0.8fr 44px';
const val = `
  text-align: center;
  font-size: ${font.scale.s13}px;
`;

export const useSlaStyles = createStyles(({ css, responsive }) => ({
  bar: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  min: css`
    min-width: 0;
  `,
  newBtn: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 38px;
    background: ${color.brand};
    color: ${color.white};
    border-radius: ${radius.r8}px;
    padding: 0 16px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    border: none;
    font-family: inherit;
    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  table: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    overflow: hidden;
    margin-bottom: 24px;
  `,
  th: css`
    display: grid;
    grid-template-columns: ${COLS};
    gap: 8px;
    padding: 12px 16px;
    background: ${color.auditHead};
    border-bottom: 1px solid ${color.divider};
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: ${color.text4};
    align-items: center;
    ${responsive.md} {
      display: none;
    }
  `,
  tr: css`
    display: grid;
    grid-template-columns: ${COLS};
    gap: 8px;
    padding: 12px 16px;
    align-items: center;
    ${responsive.md} {
      grid-template-columns: repeat(4, 1fr);
      gap: 8px 12px;
      & > :nth-child(-n + 3) {
        grid-column: 1 / -1;
      }
      & > :nth-child(n + 8) {
        grid-column: span 2;
        justify-self: start;
      }
    }
  `,
  c: css`
    text-align: center;
  `,
  cFlex: css`
    display: flex;
    justify-content: center;
  `,
  pol: css`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  `,
  bar4: css`
    width: 4px;
    height: 30px;
    border-radius: ${radius.r4}px;
    flex-shrink: 0;
  `,
  pName: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  pType: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  scope: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
  `,
  tier: css`
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text2};
    white-space: nowrap;
  `,
  ai: css`
    ${val}
    font-weight: ${font.weight.bold};
    color: ${color.violet};
  `,
  hum: css`
    ${val}
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  aiL: css`
    ${val}
    color: ${color.violet};
  `,
  humL: css`
    ${val}
    color: ${color.text};
  `,
  edit: css`
    width: 28px;
    height: 28px;
    border-radius: ${radius.r6}px;
    display: grid;
    place-items: center;
    cursor: pointer;
    color: ${color.text4};
    border: none;
    background: transparent;
    padding: 0;
    justify-self: end;
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  two: css`
    display: grid;
    grid-template-columns: 1.1fr 1fr;
    gap: 16px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  secHead: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    & > div {
      margin-bottom: 0;
    }
  `,
  secT: css`
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    margin-bottom: 12px;
  `,
  tz: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    display: inline-flex;
    align-items: center;
    gap: 4px;
  `,
  aiNote: css`
    display: flex;
    align-items: center;
    gap: 12px;
    background: ${color.violetChip};
    border: 1px solid ${color.slaAiLine};
    border-radius: ${radius.r12}px;
    padding: 12px;
    margin-bottom: 12px;
  `,
  aiNoteIc: css`
    width: 32px;
    height: 32px;
    border-radius: ${radius.r8}px;
    background: ${color.surface};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  aiNoteT: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    b {
      color: ${color.violet};
    }
  `,
  aiNoteS: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
  `,
  aiBadge: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.violet};
    background: ${color.surface};
    border-radius: ${radius.r8}px;
    padding: 4px 8px;
    white-space: nowrap;
  `,
  card: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    overflow: hidden;
  `,
  day: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid ${color.divider};
  `,
  dayOff: css`
    background: ${color.auditHead};
  `,
  dotOn: css`
    width: 9px;
    height: 9px;
    border-radius: ${radius.r4}px;
    background: ${color.okStrong};
    flex-shrink: 0;
  `,
  dotOff: css`
    width: 9px;
    height: 9px;
    border-radius: ${radius.r4}px;
    background: ${color.slaOff};
    flex-shrink: 0;
  `,
  dName: css`
    width: 34px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  dHours: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
  `,
  dToggle: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text4};
    cursor: pointer;
    border: none;
    background: transparent;
    padding: 0;
    font-family: inherit;
    ${responsive.md} {
      min-height: ${layout.touch}px;
      min-width: ${layout.touch}px;
    }
  `,
  pause: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
  `,
  pT: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  pS: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
  `,
  esc: css`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid ${color.divider};
    &:last-child {
      border-bottom: none;
    }
  `,
  escDot: css`
    width: 8px;
    height: 8px;
    border-radius: ${radius.r4}px;
    margin-top: 4px;
    flex-shrink: 0;
  `,
  escT: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  escA: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    margin-top: 2px;
  `,
  risk: css`
    display: flex;
    gap: 8px;
    align-items: flex-start;
    background: ${gradient.slaRisk};
    border-radius: ${radius.r12}px;
    padding: 16px;
    color: ${color.white};
    margin-top: 12px;
    svg {
      flex-shrink: 0;
      margin-top: 2px;
    }
  `,
  riskT: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.slaRiskAccent};
    margin-bottom: 2px;
  `,
  riskS: css`
    font-size: ${font.scale.s14}px;
    line-height: 1.55;
    color: ${color.slaRiskText};
  `,
  mHead: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    border-top: 1px solid ${color.divider};
    padding-top: 12px;
  `,
  mGrid: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  `,
  mL: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    margin-bottom: 4px;
    text-align: left;
  `,
}));
