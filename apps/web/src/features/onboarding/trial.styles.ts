// Chào mừng trial (L677–714) + hết trial (L716–737) + khởi tạo workspace (màn mới, cùng pattern thẻ).
import { createStyles } from 'antd-style';
import { color, font, gradient, radius, shadow, z } from '@appchat/ui';

export const useTrialStyles = createStyles(({ css, responsive }) => ({
  welcomeZ: css`
    z-index: ${z.welcome};
  `,
  expiredZ: css`
    z-index: ${z.expired};
  `,
  card: css`
    position: relative;
    width: 560px;
    max-width: 100%;
    background: ${color.surface};
    border-radius: ${radius.r20}px;
    box-shadow: ${shadow.welcomeCard};
    overflow: hidden;
    ${responsive.md} {
      width: 100%;
      max-width: none;
      height: 100vh;
      max-height: 100vh;
      overflow-y: auto;
      border-radius: 0;
      box-shadow: none;
    }
  `,
  cardSm: css`
    width: 540px;
    box-shadow: ${shadow.expiredCard};
  `,
  hero: css`
    position: relative;
    background: ${gradient.trialHero};
    padding: 32px 32px 28px;
    color: ${color.white};
    overflow: hidden;
    ${responsive.md} {
      padding: 32px 20px 28px;
    }
  `,
  ring: css`
    position: absolute;
    right: -68px;
    top: -68px;
    width: 250px;
    height: 250px;
    border: 1px solid ${color.mintRing};
    border-radius: 50%;
  `,
  rel: css`
    position: relative;
  `,
  eyebrow: css`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px 4px 6px;
    border: 1px solid ${color.mintLine};
    border-radius: ${radius.pill}px;
    margin-bottom: 16px;
  `,
  mark: css`
    width: 20px;
    height: 20px;
    border-radius: ${radius.r6}px;
    background: ${color.brand};
    display: grid;
    place-items: center;
    font-size: ${font.size.tag}px;
    font-weight: ${font.weight.heavy};
    color: ${color.forest};
  `,
  eyebrowText: css`
    font-size: ${font.size.micro}px;
    font-weight: ${font.weight.bold};
    letter-spacing: 0.13em;
    color: ${color.mint};
  `,
  heroTitle: css`
    font-size: ${font.size.welcome}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: -0.025em;
    line-height: 1.18;
    ${responsive.md} {
      font-size: ${font.scale.s20}px;
    }
  `,
  heroBody: css`
    font-size: ${font.size.lead2}px;
    line-height: 1.6;
    margin-top: 8px;
    opacity: 0.92;
  `,
  body: css`
    padding: 24px 32px 28px;
    ${responsive.md} {
      padding: 24px 20px 28px;
    }
  `,
  box: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 16px;
    background: ${color.brandBg};
    border: 1px solid ${color.brandLine};
    border-radius: ${radius.xl}px;
  `,
  days: css`
    width: 52px;
    height: 52px;
    border-radius: ${radius.xxl}px;
    background: ${color.surface};
    border: 1.5px solid ${color.trialBorder};
    display: grid;
    place-items: center;
    flex-shrink: 0;
    font-size: ${font.size.trialNum}px;
    font-weight: ${font.weight.heavy};
    color: ${color.brandInk};
    line-height: 1;
  `,
  boxTitle: css`
    font-size: ${font.size.title}px;
    font-weight: ${font.weight.heavy};
    color: ${color.brandInkDeep};
  `,
  boxSub: css`
    font-size: ${font.size.sub13}px;
    color: ${color.brandMuted};
    line-height: 1.5;
    margin-top: 2px;
  `,
  minw: css`
    min-width: 0;
  `,
  list: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 20px 0 20px;
  `,
  perk: css`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: ${font.size.perk}px;
    color: ${color.text2};
    line-height: 1.5;
    & > svg {
      margin-top: 2px;
    }
  `,
  cta: css`
    width: 100%;
    height: 48px;
    background: ${color.brand};
    color: ${color.white};
    border-radius: ${radius.r10}px;
    font-weight: ${font.weight.bold};
    font-size: ${font.size.input}px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: ${shadow.btnGlow};
    border: none;
    font-family: inherit;
  `,
  ghost: css`
    width: 100%;
    height: 44px;
    margin-top: 8px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.textBtn2};
    border-radius: ${radius.r10}px;
    font-weight: ${font.weight.bold};
    font-size: ${font.size.body}px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: inherit;
  `,
  foot: css`
    text-align: center;
    font-size: ${font.size.caption}px;
    color: ${color.text4};
    margin-top: 12px;
    line-height: 1.5;
  `,
  close: css`
    position: absolute;
    right: 16px;
    top: 16px;
    width: 32px;
    height: 32px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    cursor: pointer;
    color: ${color.text4};
    background: none;
    border: none;
    ${responsive.md} {
      width: 44px;
      height: 44px;
      right: 8px;
      top: 8px;
    }
  `,
  exHead: css`
    padding: 28px 32px 24px;
    border-bottom: 1px solid ${color.divider};
    ${responsive.md} {
      padding: 28px 20px 24px;
    }
  `,
  exIcon: css`
    width: 52px;
    height: 52px;
    border-radius: ${radius.xxl}px;
    background: ${color.dangerSoftBg};
    border: 1.5px solid ${color.dangerSoftBorder};
    display: grid;
    place-items: center;
    margin-bottom: 16px;
  `,
  exTitle: css`
    font-size: ${font.size.expired}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: -0.02em;
    color: ${color.text};
    line-height: 1.22;
    ${responsive.md} {
      font-size: ${font.scale.s20}px;
    }
  `,
  exBody: css`
    font-size: ${font.size.body}px;
    color: ${color.text3};
    line-height: 1.62;
    margin-top: 8px;
    & b {
      color: ${color.text};
    }
  `,
  exPad: css`
    padding: 20px 32px 28px;
    ${responsive.md} {
      padding: 20px 20px 28px;
    }
  `,
  locks: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 20px;
  `,
  lock: css`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: ${font.size.lock}px;
    color: ${color.text3};
    line-height: 1.5;
    & > svg {
      margin-top: 2px;
    }
  `,
  footTight: css`
    margin-top: 12px;
  `,
}));
