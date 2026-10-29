// Popup onboarding / trial — prototype L677–790 (+ < md toàn màn L297–330). Giá trị qua token packages/ui.
import { createStyles } from 'antd-style';
import { color, font, radius, shadow, z } from '@appchat/ui';

export const useOnbStyles = createStyles(({ css, responsive }) => ({
  veil: css`
    position: fixed;
    inset: 0;
    background: ${color.onbVeil};
    z-index: ${z.onboarding};
    display: grid;
    place-items: center;
    padding: 24px;
    font-family: ${font.family};
    line-height: normal;
    color: ${color.text};
    ${responsive.md} {
      padding: 0;
      place-items: stretch;
    }
  `,
  veilDark: css`
    background: ${color.welcomeVeil};
  `,
  card: css`
    width: 520px;
    max-width: 100%;
    max-height: 92vh;
    overflow-y: auto;
    background: ${color.surface};
    border-radius: ${radius.modal}px;
    box-shadow: ${shadow.onbCard};
    scrollbar-width: none;
    &::-webkit-scrollbar {
      width: 0;
    }
    ${responsive.md} {
      width: 100%;
      max-width: none;
      max-height: 100vh;
      height: 100vh;
      border-radius: 0;
      box-shadow: none;
    }
  `,
  pad: css`
    padding: 22px 26px 12px;
    ${responsive.md} {
      padding: 22px 20px 20px;
    }
  `,
  prog: css`
    display: flex;
    gap: 6px;
    margin-bottom: 16px;
  `,
  progBar: css`
    flex: 1;
    height: 5px;
    border-radius: 3px;
    background: ${color.border};
  `,
  progOn: css`
    background: ${color.brand};
  `,
  title: css`
    font-size: ${font.size.onbTitle}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: -0.5px;
    margin-bottom: 6px;
    color: ${color.text};
    ${responsive.md} {
      font-size: 22px;
    }
  `,
  sub: css`
    color: ${color.text3};
    margin-bottom: 20px;
    font-size: ${font.size.bodyLg}px;
  `,
  subLoose: css`
    line-height: 1.55;
  `,
  types: css`
    display: flex;
    gap: 8px;
    margin-bottom: 18px;
  `,
  type: css`
    flex: 1;
    padding: 12px 10px;
    border-radius: ${radius.lg}px;
    text-align: left;
    cursor: pointer;
    border: 1px solid ${color.border};
    background: ${color.surface};
    font-family: inherit;
    min-height: 44px;
  `,
  typeOn: css`
    border-color: ${color.brand};
    background: ${color.brandBg};
  `,
  typeName: css`
    font-weight: ${font.weight.bold};
    font-size: ${font.size.bodyLg}px;
    color: ${color.text};
  `,
  typeSub: css`
    font-size: ${font.size.small}px;
    color: ${color.text3};
  `,
  label: css`
    font-size: ${font.size.body}px;
    font-weight: ${font.weight.semibold};
    margin-bottom: 6px;
    color: ${color.text};
  `,
  lookupRow: css`
    display: flex;
    gap: 8px;
    margin-bottom: 6px;
    ${responsive.md} {
      flex-direction: column;
    }
  `,
  input: css`
    width: 100%;
    height: 44px;
    border-radius: ${radius.md}px;
    border: 1px solid ${color.border};
    background: ${color.bg};
    padding: 0 14px;
    font-size: ${font.size.input}px;
    outline: none;
    font-family: inherit;
    color: ${color.text};
    box-sizing: border-box;
    margin-bottom: 14px;
    ${responsive.md} {
      min-height: 48px;
      font-size: 16px;
    }
  `,
  inputBare: css`
    margin-bottom: 0;
  `,
  readOnly: css`
    background: ${color.muteBg};
  `,
  textarea: css`
    height: 100px;
    padding: 12px 14px;
    resize: none;
    line-height: 1.55;
    margin-bottom: 20px;
  `,
  lookup: css`
    display: inline-flex;
    align-items: center;
    height: 44px;
    padding: 0 16px;
    border-radius: ${radius.md}px;
    background: ${color.text};
    color: ${color.white};
    font-size: ${font.size.body}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    white-space: nowrap;
    border: none;
    font-family: inherit;
    ${responsive.md} {
      width: 100%;
      height: 48px;
      justify-content: center;
    }
  `,
  found: css`
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 9px 12px;
    background: ${color.brandBg};
    border: 1px solid ${color.brandLine3};
    border-radius: 9px;
    margin-bottom: 14px;
    font-size: ${font.size.hint}px;
    color: ${color.brandInkDeep};
  `,
  notFound: css`
    background: ${color.warnBg};
    border-color: ${color.warnBg};
    color: ${color.warn};
  `,
  pair: css`
    display: flex;
    gap: 12px;
    margin-bottom: 14px;
    & > div {
      flex: 1;
    }
    ${responsive.md} {
      flex-direction: column;
    }
  `,
  pairLast: css`
    margin-bottom: 20px;
  `,
  btn: css`
    width: 100%;
    height: 48px;
    background: ${color.brand};
    color: ${color.white};
    border-radius: 11px;
    font-weight: ${font.weight.bold};
    font-size: ${font.size.btn}px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: none;
    font-family: inherit;
    &:disabled {
      background: ${color.disabled};
      cursor: not-allowed;
    }
  `,
  back: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: ${font.size.body}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text3};
    cursor: pointer;
    margin-bottom: 18px;
    background: none;
    border: none;
    padding: 0;
    font-family: inherit;
  `,
  note: css`
    text-align: center;
    font-size: ${font.size.noteSm}px;
    color: ${color.text4};
    margin-top: 10px;
  `,
}));
