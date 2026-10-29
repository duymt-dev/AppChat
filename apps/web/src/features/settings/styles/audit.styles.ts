// Audit log — prototype L7025–7042: đầu (tiêu đề 15 + mô tả 13 + chip "Xuất JSON"), bảng header nền FAFBFB in hoa 12, hàng 14,
// lưới 80 / 1.5fr / 2.5fr / 1fr (người) và 80 / 1.5fr / 1.5fr / 2fr / 80 (AI), pill trạng thái 11.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

const pill = `
  font-size: ${font.scale.s11}px;
  font-weight: ${font.weight.bold};
  padding: 2px 8px;
  border-radius: ${radius.r10}px;
`;

export const useAuditStyles = createStyles(({ css, responsive }) => ({
  head: css`
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    gap: 8px;
    ${responsive.md} {
      flex-wrap: wrap;
    }
  `,
  t: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  s: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
  `,
  grow: css`
    flex: 1;
  `,
  exp: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 0 12px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    background: transparent;
    font-family: inherit;
    cursor: pointer;
    align-self: stretch;
    svg {
      transform: rotate(180deg);
    }
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  table: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    overflow: hidden;
  `,
  g4: css`
    grid-template-columns: 80px 1.5fr 2.5fr 1fr;
    ${responsive.md} {
      grid-template-columns: 64px 1fr;
      & > :nth-child(3) {
        grid-column: 1 / -1;
      }
    }
  `,
  g5: css`
    grid-template-columns: 80px 1.5fr 1.5fr 2fr 80px;
    ${responsive.md} {
      grid-template-columns: 72px 1fr auto;
      & > :nth-child(3) {
        grid-column: 1 / -1;
        order: 5;
      }
    }
  `,
  th: css`
    display: grid;
    gap: 12px;
    padding: 12px 20px;
    background: ${color.auditHead};
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
  tr: css`
    display: grid;
    gap: 12px;
    padding: 12px 20px;
    align-items: center;
    border-bottom: 1px solid ${color.divider};
    font-size: ${font.scale.s14}px;
    ${responsive.md} {
      padding: 12px;
      gap: 4px 12px;
    }
  `,
  hideM: css`
    ${responsive.md} {
      display: none;
    }
  `,
  mono: css`
    font-family: ${font.mono};
    color: ${color.text3};
  `,
  who: css`
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  act: css`
    color: ${color.text3};
  `,
  text: css`
    color: ${color.text};
  `,
  ip: css`
    font-family: ${font.mono};
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  ok: css`
    ${pill}
    background: ${color.aiTierBadge};
    color: ${color.brandInk};
  `,
  warn: css`
    ${pill}
    background: ${color.amberBg};
    color: ${color.govWarnText};
  `,
  esc: css`
    ${pill}
    background: ${color.dangerBg};
    color: ${color.govRiskText};
  `,
}));
