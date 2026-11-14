// Thẻ kế hoạch Cowork (TIP-023d §6.1) — màn mới (prototype không có, PD-027): token + pattern thẻ xác nhận / thẻ duyệt của Trợ lý.
import { createStyles } from 'antd-style';
import { color, font, radius, shadow } from '@appchat/ui';

export const usePlanStyles = createStyles(({ css, responsive }) => ({
  card: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    box-shadow: ${shadow.table};
    padding: 16px;
    margin-top: 8px;
    max-width: 560px;
  `,
  head: css`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  `,
  title: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    flex: 1;
    min-width: 0;
  `,
  meta: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
  `,
  bar: css`
    height: 6px;
    border-radius: ${radius.r12}px;
    background: ${color.muteBg};
    overflow: hidden;
    margin: 8px 0;
    & > span {
      display: block;
      height: 100%;
      background: ${color.brand};
    }
  `,
  steps: css`
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  `,
  step: css`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: ${font.scale.s14}px;
    min-height: 32px;
  `,
  pos: css`
    width: 22px;
    height: 22px;
    border-radius: ${radius.r10}px;
    background: ${color.muteBg};
    color: ${color.textBtn2};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    flex-shrink: 0;
  `,
  stepTitle: css`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  pill: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    border-radius: ${radius.pill}px;
    padding: 2px 8px;
    white-space: nowrap;
  `,
  actions: css`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 12px;
    ${responsive.md} {
      & > button {
        min-height: 44px;
        flex: 1;
      }
    }
  `,
  note: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
    margin-top: 8px;
  `,
  input: css`
    width: 100%;
    font-family: inherit;
    font-size: ${font.scale.s14}px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 6px 8px;
  `,
  iconBtn: css`
    border: none;
    background: transparent;
    cursor: pointer;
    min-width: 32px;
    min-height: 32px;
    border-radius: ${radius.r8}px;
    color: ${color.text3};
    ${responsive.md} {
      min-width: 44px;
      min-height: 44px;
    }
    &:disabled {
      opacity: 0.4;
      cursor: default;
    }
  `,
  reuse: css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  `,
  chip: css`
    border: 1px solid ${color.border};
    background: ${color.surface};
    border-radius: ${radius.pill}px;
    padding: 4px 12px;
    font-family: inherit;
    font-size: ${font.scale.s13}px;
    cursor: pointer;
    min-height: 32px;
    ${responsive.md} {
      min-height: 44px;
    }
  `,
}));
