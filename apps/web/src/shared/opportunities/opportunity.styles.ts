// Thẻ "Cơ hội / Sales Pipeline" của Hồ sơ 360° (TIP-026c) — prototype L2386–2417: thẻ 12px viền + vòng brand, thanh 6 đoạn 10px, dòng
// khoá–giá trị 14px, khối bước tiếp / gợi ý AI 8px, hai nút 36px, lịch sử chấm 9px. Drawer: opportunity-drawer.styles.ts.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

const btn = `height: ${layout.chip}px; border-radius: ${radius.r8}px; border: 1px solid ${color.brand}; font-weight: ${font.weight.bold}; font-size: ${font.scale.s14}px; cursor: pointer; font-family: inherit;`;

export const useOpportunityStyles = createStyles(({ css }) => ({
  card: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    background: ${color.surface};
    padding: 12px;
    margin-bottom: 12px;
    box-shadow: 0 0 0 2px ${color.brandEdgeSoft};
  `,
  head: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  `,
  eyebrow: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${color.text};
  `,
  link: css`
    margin-left: auto;
    border: none;
    background: none;
    padding: 0;
    font-family: inherit;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.brandInk};
    cursor: pointer;
    &:hover {
      text-decoration: underline;
    }
  `,
  titleRow: css`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 8px;
  `,
  title: css`
    flex: 1;
    font-weight: ${font.weight.bold};
    font-size: ${font.scale.s15}px;
    color: ${color.text};
    line-height: 1.35;
  `,
  chip: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    border-radius: ${radius.r6}px;
    padding: 2px 8px;
    white-space: nowrap;
  `,
  label: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
    margin-bottom: 6px;
    & span {
      font-weight: ${font.weight.medium};
    }
  `,
  stageRow: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 6px 0 4px;
  `,
  prob: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    & b {
      color: ${color.text};
    }
  `,
  kv: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    font-size: ${font.scale.s14}px;
    padding: 6px 0;
    border-top: 1px solid ${color.divider};
    & > span:first-child {
      color: ${color.text3};
      flex-shrink: 0;
    }
    & b {
      color: ${color.text};
      text-align: right;
    }
  `,
  fc: css`
    && {
      color: ${color.brandInk};
    }
  `,
  owner: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: ${font.weight.bold};
  `,
  ownerAv: css`
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: ${color.brand};
    color: ${color.white};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s11}px;
  `,
  quoteState: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.paidText};
  `,
  next: css`
    margin-top: 8px;
    display: flex;
    gap: 8px;
    align-items: flex-start;
    padding: 8px 12px;
    border-radius: ${radius.r8}px;
    background: ${color.oppNextBg};
    font-size: ${font.scale.s14}px;
    line-height: 1.45;
  `,
  nextWarn: css`
    background: ${color.oppNextWarnBg};
  `,
  ai: css`
    margin-top: 8px;
    display: flex;
    gap: 8px;
    padding: 8px 12px;
    background: ${color.brandBg};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s14}px;
    line-height: 1.5;
    & > svg {
      flex-shrink: 0;
      margin-top: 2px;
    }
    & b {
      color: ${color.brandInk};
    }
  `,
  aiText: css`
    color: ${color.pillText};
    & b {
      color: ${color.text};
    }
  `,
  aiBtns: css`
    display: flex;
    gap: 6px;
    margin-top: 6px;
  `,
  aiApply: css`
    font-family: inherit;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    border: none;
    border-radius: ${radius.r6}px;
    padding: 4px 8px;
    background: ${color.brand};
    color: ${color.white};
    cursor: pointer;
  `,
  aiSkip: css`
    font-family: inherit;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    border: 1px solid ${color.oppPickLine};
    border-radius: ${radius.r6}px;
    padding: 4px 8px;
    background: ${color.surface};
    color: ${color.brandInk};
    cursor: pointer;
  `,
  actions: css`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin-top: 12px;
  `,
  primary: css`
    ${btn}
    background: ${color.brand};
    color: ${color.white};
    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  `,
  outline: css`
    ${btn}
    background: ${color.surface};
    color: ${color.brandInk};
  `,
  hist: css`
    margin-top: 12px;
    border-top: 1px solid ${color.divider};
    padding-top: 8px;
  `,
  histItem: css`
    display: flex;
    gap: 8px;
    padding-bottom: 8px;
    width: 100%;
    border: none;
    background: none;
    text-align: left;
    font-family: inherit;
    cursor: pointer;
  `,
  dot: css`
    width: 9px;
    height: 9px;
    border-radius: 50%;
    margin-top: 4px;
    flex-shrink: 0;
  `,
  histBody: css`
    min-width: 0;
    flex: 1;
  `,
  histTop: css`
    display: flex;
    gap: 6px;
    align-items: baseline;
    & span {
      font-size: ${font.scale.s14}px;
      font-weight: ${font.weight.bold};
      color: ${color.text};
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    & b {
      font-size: ${font.scale.s13}px;
    }
  `,
  meta: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
    margin-top: 2px;
  `,
  status: css`
    display: inline-block;
    margin-top: 2px;
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    border-radius: ${radius.r4}px;
    padding: 2px 6px;
  `,
  empty: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    padding: 4px 0;
  `,
}));
