// Thẻ hoạt động CRM của Hồ sơ 360° (TIP-026b) — prototype L2401–2445: thẻ 12px, nhãn 12px, link xanh, ô check 16px, khung ghi chú xám.
// Cùng thang panel.styles của Hộp thư (shared không import feature — tách bản riêng cùng token).
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useActivityStyles = createStyles(({ css, responsive }) => ({
  card: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    background: ${color.surface};
    padding: 12px;
    margin-bottom: 12px;
  `,
  head: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
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
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.brandInk};
    cursor: pointer;
    border: none;
    background: none;
    font-family: inherit;
    padding: 0;
    &:hover {
      text-decoration: underline;
    }
    &:disabled {
      cursor: default;
      opacity: 0.5;
    }
  `,
  title: css`
    font-weight: ${font.weight.bold};
    font-size: ${font.scale.s15}px;
    color: ${color.text};
    margin-bottom: 8px;
  `,
  kv: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: ${font.scale.s14}px;
    padding: 6px 0;
    border-top: 1px solid ${color.divider};
    color: ${color.text3};
    & b {
      color: ${color.text};
    }
  `,
  stage: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.dealText};
    background: ${color.dealBg};
    border-radius: ${radius.r6}px;
    padding: 2px 8px;
  `,
  needLabel: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
    margin: 12px 0 6px;
    padding-top: 8px;
    border-top: 1px solid ${color.divider};
  `,
  need: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 8px 12px;
    font-size: ${font.scale.s14}px;
    line-height: 1.5;
    background: ${color.bg};
    color: ${color.text};
    white-space: pre-wrap;
  `,
  outline: css`
    width: 100%;
    margin-top: 12px;
    height: 34px;
    border-radius: ${radius.r8}px;
    border: 1px solid ${color.brand};
    background: ${color.surface};
    color: ${color.brandInk};
    font-weight: ${font.weight.bold};
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    cursor: pointer;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  task: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    font-size: ${font.scale.s14}px;
    & + & {
      border-top: 1px solid ${color.divider};
    }
  `,
  check: css`
    width: 16px;
    height: 16px;
    border-radius: ${radius.r4}px;
    border: 2px solid ${color.border};
    background: ${color.surface};
    display: grid;
    place-items: center;
    flex-shrink: 0;
    padding: 0;
    cursor: pointer;
    &:disabled {
      cursor: default;
      opacity: 0.6;
    }
  `,
  checked: css`
    border: none;
    background: ${color.brand};
  `,
  taskTitle: css`
    flex: 1;
    min-width: 0;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    border: none;
    background: none;
    text-align: left;
    padding: 0;
    font: inherit;
    font-weight: ${font.weight.semibold};
    cursor: pointer;
  `,
  done: css`
    text-decoration: line-through;
    color: ${color.text4};
  `,
  due: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
    font-weight: ${font.weight.semibold};
    white-space: nowrap;
  `,
  overdue: css`
    color: ${color.danger};
  `,
  noteBox: css`
    background: ${color.bg};
    border: 1px solid ${color.divider};
    border-radius: ${radius.r10}px;
    padding: 12px;
  `,
  noteLabel: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.text4};
    margin-bottom: 4px;
  `,
  body: css`
    font-size: ${font.scale.s14}px;
    line-height: 1.55;
    color: ${color.text};
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  `,
  meta: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    margin-top: 2px;
  `,
  composer: css`
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  `,
  input: css`
    flex: 1;
    min-width: 0;
    height: 34px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 0 12px;
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    background: ${color.bg};
    color: ${color.text};
    outline: none;
    &:focus {
      border-color: ${color.brand};
      background: ${color.surface};
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  send: css`
    width: 34px;
    height: 34px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    background: ${color.surface};
    display: grid;
    place-items: center;
    flex-shrink: 0;
    cursor: pointer;
    &:disabled {
      cursor: default;
      opacity: 0.5;
    }
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  comment: css`
    display: flex;
    gap: 8px;
    & + & {
      margin-top: 12px;
    }
  `,
  avatar: css`
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: ${color.brandInk};
    color: ${color.white};
    display: grid;
    place-items: center;
    font-weight: ${font.weight.bold};
    font-size: ${font.scale.s12}px;
    flex-shrink: 0;
  `,
  agent: css`
    background: ${color.violet};
  `,
  author: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  empty: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
  `,
  more: css`
    margin-top: 8px;
    border: none;
    background: none;
    padding: 0;
    font: inherit;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.brandInk};
    cursor: pointer;
  `,
  row: css`
    display: flex;
    gap: 8px;
  `,
  error: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.danger};
    margin-bottom: 12px;
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
}));
