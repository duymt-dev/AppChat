// Trang ký công khai `/sign/[token]` (COMMERCE §9 C1, Blueprint §7.2 (public)/sign) — không có prototype: dùng token + bố cục thẻ của màn auth.
import { createStyles } from 'antd-style';
import { color, font, layout, radius, shadow } from '@appchat/ui';

export const useSignStyles = createStyles(({ css, responsive }) => ({
  page: css`
    min-height: 100vh;
    background: ${color.bg};
    font-family: ${font.family};
    padding: 32px 16px;
    box-sizing: border-box;
    ${responsive.md} {
      padding: 16px 12px;
    }
  `,
  wrap: css`
    max-width: 720px;
    margin: 0 auto;
  `,
  brand: css`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.heavy};
    color: ${color.brandInk};
    margin-bottom: 16px;
  `,
  card: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r16}px;
    padding: 20px;
    margin-bottom: 16px;
    box-shadow: ${shadow.card};
  `,
  h1: css`
    font-size: ${font.scale.s22}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    letter-spacing: -0.01em;
  `,
  muted: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    margin-top: 4px;
  `,
  h: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${color.text4};
    margin-bottom: 12px;
  `,
  parties: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  party: css`
    border: 1px solid ${color.divider};
    border-radius: ${radius.r12}px;
    padding: 12px;
    background: ${color.bg};
  `,
  pl: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  pv: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    margin-top: 2px;
  `,
  ok: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 6px;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
  `,
  wait: css`
    color: ${color.amberText};
  `,
  kv: css`
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: ${font.scale.s14}px;
    padding: 6px 0;
    border-bottom: 1px solid ${color.divider};
    span {
      color: ${color.text3};
    }
    b {
      color: ${color.text};
      font-weight: ${font.weight.semibold};
      text-align: right;
      overflow-wrap: anywhere;
    }
  `,
  clauses: css`
    margin: 12px 0 0;
    padding-left: 20px;
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    line-height: 1.6;
  `,
  consent: css`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    cursor: pointer;
    margin-bottom: 16px;
    min-height: ${layout.touch}px;
    input {
      width: 18px;
      height: 18px;
      accent-color: ${color.brand};
      margin: 2px 0 0;
      flex-shrink: 0;
    }
  `,
  row: css`
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 8px;
  `,
  input: css`
    flex: 1;
    min-width: 140px;
    height: ${layout.touch}px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 0 12px;
    font-size: ${font.scale.s16}px;
    font-family: ${font.mono};
    letter-spacing: 0.3em;
    outline: none;
    box-sizing: border-box;
    &:focus {
      border-color: ${color.brand};
    }
  `,
  label: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
    margin: 8px 0 4px;
    button {
      border: none;
      background: transparent;
      color: ${color.brandInk};
      font-weight: ${font.weight.bold};
      cursor: pointer;
      font-family: inherit;
      font-size: ${font.scale.s13}px;
      min-height: ${layout.touch}px;
    }
  `,
  hint: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  dev: css`
    font-size: ${font.scale.s12}px;
    color: ${color.violet};
    font-family: ${font.mono};
  `,
  btn: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: ${layout.touch}px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 0 16px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text2};
    background: ${color.surface};
    cursor: pointer;
    font-family: inherit;
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
  primary: css`
    background: ${color.brand};
    border-color: ${color.brand};
    color: ${color.white};
  `,
  danger: css`
    color: ${color.dangerDeep};
  `,
  actions: css`
    display: flex;
    gap: 8px;
    margin-top: 16px;
    button {
      flex: 1;
    }
  `,
  state: css`
    text-align: center;
    padding: 32px 20px;
  `,
  stateIc: css`
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    margin: 0 auto 12px;
  `,
  hash: css`
    font-family: ${font.mono};
    font-size: ${font.scale.s12}px;
    color: ${color.text};
    overflow-wrap: anywhere;
    text-align: left;
  `,
  trail: css`
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    text-align: left;
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
    span {
      color: ${color.text4};
      font-size: ${font.scale.s12}px;
      margin-left: 6px;
    }
  `,
}));
