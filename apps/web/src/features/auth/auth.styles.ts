// Style màn auth — prototype L459–630 (+ responsive L356–375). Giá trị qua token packages/ui.
import { createStyles } from 'antd-style';
import { color, font, mq, radius, shadow } from '@appchat/ui';

export const useAuthStyles = createStyles(({ css, responsive }) => ({
  wrap: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    height: 100vh;
    background: ${color.surface};
    font-family: ${font.family};
    color: ${color.text};
    line-height: normal;
    ${mq.auth} {
      grid-template-columns: 1fr;
    }
    ${responsive.md} {
      height: auto;
      min-height: 100vh;
    }
  `,
  form: css`
    display: flex;
    flex-direction: column;
    padding: 40px 60px;
    overflow-y: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      width: 0;
    }
    ${mq.auth} {
      padding: 40px 48px;
      max-width: 560px;
      margin: 0 auto;
      width: 100%;
    }
    ${responsive.md} {
      padding: 26px 20px 36px;
      max-width: none;
    }
  `,
  logoRow: css`
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 48px;
    & img {
      width: 36px;
      height: 36px;
      border-radius: 9px;
    }
    ${responsive.md} {
      margin-bottom: 28px;
    }
  `,
  logoText: css`
    font-weight: ${font.weight.heavy};
    font-size: ${font.size.h1}px;
    letter-spacing: -0.5px;
    color: ${color.text};
    & span {
      color: ${color.brand};
    }
  `,
  edition: css`
    margin-left: 8px;
    font-size: ${font.size.tag}px;
    padding: 2px 6px;
    background: ${color.brandBg};
    color: ${color.brandInk};
    border-radius: 4px;
    font-weight: ${font.weight.bold};
    vertical-align: middle;
  `,
  body: css`
    max-width: 420px;
    width: 100%;
    margin: auto 0;
  `,
  title: css`
    font-size: ${font.size.authTitle}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: -0.8px;
    margin-bottom: 6px;
    color: ${color.text};
    ${responsive.md} {
      font-size: 25px;
    }
  `,
  titleMd: css`
    font-size: ${font.size.stepTitle}px;
    letter-spacing: -0.6px;
    ${responsive.md} {
      font-size: 23px;
    }
  `,
  titleReg: css`
    font-size: ${font.size.regTitle}px;
    letter-spacing: -0.7px;
    ${responsive.md} {
      font-size: 25px;
    }
  `,
  sub: css`
    color: ${color.text3};
    margin-bottom: 28px;
    font-size: ${font.size.input}px;
  `,
  subSm: css`
    color: ${color.text3};
    margin-bottom: 24px;
    font-size: ${font.size.bodyLg}px;
    line-height: 1.55;
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
    &:hover {
      text-decoration: underline;
    }
  `,
  field: css`
    margin-bottom: 16px;
  `,
  label: css`
    font-size: ${font.size.body}px;
    font-weight: ${font.weight.semibold};
    margin-bottom: 6px;
    color: ${color.text};
    display: flex;
    justify-content: space-between;
  `,
  inputWrap: css`
    position: relative;
    & > svg {
      position: absolute;
      left: 12px;
      top: 16px;
    }
  `,
  iconHigh: css`
    & > svg {
      top: 14px;
    }
  `,
  input: css`
    width: 100%;
    height: 48px;
    border-radius: ${radius.md}px;
    border: 1px solid ${color.border};
    background: ${color.bg};
    padding: 0 14px 0 40px;
    font-size: ${font.size.input}px;
    outline: none;
    font-family: inherit;
    color: ${color.text};
    ${responsive.md} {
      font-size: 16px;
    }
  `,
  inputPw: css`
    padding-right: 40px;
  `,
  link: css`
    color: ${color.brand};
    font-weight: ${font.weight.semibold};
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    font-weight: ${font.weight.semibold};
    &:hover {
      text-decoration: underline;
    }
  `,
  remember: css`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: ${font.size.body}px;
    margin-bottom: 20px;
    cursor: pointer;
    color: ${color.text};
    min-height: 24px;
  `,
  check: css`
    width: 16px;
    height: 16px;
    border-radius: 4px;
    display: grid;
    place-items: center;
    border: 1px solid ${color.brand};
    background: ${color.brand};
  `,
  checkOff: css`
    border-color: ${color.disabled};
    background: ${color.surface};
  `,
  primary: css`
    width: 100%;
    height: 48px;
    background: ${color.brand};
    color: ${color.white};
    border-radius: ${radius.md}px;
    font-weight: ${font.weight.bold};
    font-size: ${font.size.btn}px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: ${shadow.btnGlow};
    border: none;
    font-family: inherit;
    &:disabled {
      background: ${color.disabled};
      box-shadow: none;
      cursor: not-allowed;
    }
  `,
  primaryFlat: css`
    box-shadow: none;
  `,
  center: css`
    text-align: center;
    font-size: ${font.size.body}px;
    color: ${color.text3};
    margin-top: 22px;
  `,
  footer: css`
    display: flex;
    gap: 16px;
    font-size: ${font.size.small}px;
    color: ${color.text4};
    margin-top: 40px;
    align-items: center;
  `,
  lang: css`
    margin-left: auto;
    height: 32px;
    border: 1px solid ${color.border};
    border-radius: ${radius.sm}px;
    background: ${color.surface};
    padding: 0 10px;
    font-size: ${font.size.small}px;
    font-family: inherit;
    color: ${color.text2};
    cursor: pointer;
    min-width: 156px;
  `,
  badgeIcon: css`
    width: 56px;
    height: 56px;
    border-radius: 14px;
    background: ${color.brandBg};
    display: grid;
    place-items: center;
    margin-bottom: 16px;
  `,
}));
