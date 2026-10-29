// Khung "Trợ lý AI đang điều phối" ở Cowork (REQ-E14) — thanh thu gọn + modal danh sách run.
// Prototype L736–753 (modal), L1521–1528 (thanh thu gọn trong tab Cowork của Composer).
import { createStyles } from 'antd-style';
import { color, font, gradient, radius, shadow } from '@appchat/ui';

export const useRunsStyles = createStyles(({ css }) => ({
  bar: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    background: ${color.surface};
    margin-bottom: 16px;
    overflow: hidden;
    text-align: left;
  `,
  barHead: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: ${gradient.news};
    cursor: pointer;
    border: none;
    width: 100%;
    font-family: inherit;
  `,
  icon: css`
    width: 34px;
    height: 34px;
    border-radius: ${radius.r10}px;
    background: #231f20;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  grow: css`
    flex: 1;
    min-width: 0;
    text-align: left;
  `,
  title: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
  `,
  summary: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
    margin-top: 2px;
  `,
  caret: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
    white-space: nowrap;
  `,
  veil: css`
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.5);
    z-index: 1450;
    display: grid;
    place-items: center;
    padding: 20px;
  `,
  modal: css`
    width: 680px;
    max-width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    background: ${color.surface};
    border-radius: ${radius.r16}px;
    box-shadow: ${shadow.cwDrawer};
    overflow: hidden;
  `,
  modalHead: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid ${color.divider};
    background: ${gradient.news};
  `,
  x: css`
    width: 32px;
    height: 32px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    cursor: pointer;
    color: ${color.text4};
    border: none;
    background: transparent;
    flex-shrink: 0;
  `,
  list: css`
    flex: 1;
    overflow-y: auto;
  `,
  row: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-top: 1px solid ${color.divider};
  `,
  task: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
  `,
  meta: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
  `,
  agent: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    border-radius: ${radius.r6}px;
    padding: 2px 8px;
  `,
  metaTxt: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  bar2: css`
    height: 5px;
    border-radius: ${radius.r4}px;
    background: ${color.pillBg};
    margin-top: 8px;
    overflow: hidden;
    & > span {
      display: block;
      height: 100%;
      border-radius: ${radius.r4}px;
    }
  `,
  st: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    border-radius: ${radius.r12 * 2}px;
    padding: 2px 8px;
    white-space: nowrap;
  `,
  act: css`
    display: inline-flex;
    align-items: center;
    height: 30px;
    padding: 0 12px;
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    white-space: nowrap;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text2};
    font-family: inherit;
  `,
  actPrimary: css`
    border-color: transparent;
    background: ${color.brand};
    color: ${color.white};
  `,
}));
