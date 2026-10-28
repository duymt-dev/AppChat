// Phần riêng của từng bước auth (thanh tiến độ, gợi ý, thẻ đã xác thực…) — prototype L478–600.
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

export const useAuthPartStyles = createStyles(({ css }) => ({
  prog: css`
    display: flex;
    gap: 4px;
    margin-bottom: 8px;
  `,
  progBar: css`
    flex: 1;
    height: 5px;
    border-radius: ${radius.r4}px;
    background: ${color.border};
  `,
  progOn: css`
    background: ${color.brand};
  `,
  stepLabel: css`
    font-size: ${font.size.step}px;
    font-weight: ${font.weight.bold};
    letter-spacing: 0.06em;
    color: ${color.text4};
    margin-bottom: 16px;
  `,
  hint: css`
    text-align: center;
    font-size: ${font.size.hint}px;
    color: ${color.text4};
    margin-top: 12px;
    line-height: 1.5;
  `,
  linkRow: css`
    text-align: center;
    margin-top: 16px;
    font-size: ${font.size.body}px;
  `,
  sent: css`
    color: ${color.text3};
    margin-bottom: 16px;
    font-size: ${font.size.bodyLg}px;
    line-height: 1.55;
    & b {
      color: ${color.text};
    }
  `,
  sentLg: css`
    margin-bottom: 20px;
  `,
  perks: css`
    display: flex;
    gap: 16px;
    justify-content: center;
    margin-top: 16px;
    font-size: ${font.size.small}px;
    font-weight: ${font.weight.semibold};
    & > span {
      display: inline-flex;
      gap: 4px;
      align-items: center;
      color: ${color.brandDeep};
    }
  `,
  resend: css`
    font-size: ${font.size.body}px;
    color: ${color.text3};
    margin-bottom: 20px;
    & b {
      color: ${color.text};
    }
  `,
  verifiedIcon: css`
    width: 60px;
    height: 60px;
    border-radius: ${radius.card}px;
    background: ${color.brandBg};
    border: 1px solid ${color.brandLine2};
    display: grid;
    place-items: center;
    margin-bottom: 16px;
  `,
  userCard: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.lg}px;
    background: ${color.bg};
    margin-bottom: 16px;
  `,
  userAvatar: css`
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: ${color.brand};
    color: ${color.white};
    display: grid;
    place-items: center;
    font-weight: ${font.weight.heavy};
    font-size: ${font.size.upgrade}px;
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  userName: css`
    font-weight: ${font.weight.bold};
    font-size: ${font.size.title}px;
    color: ${color.text};
  `,
  userSub: css`
    font-size: ${font.size.body}px;
    color: ${color.text3};
    overflow-wrap: anywhere;
  `,
  badge: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: ${font.size.step}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
    background: ${color.brandBg};
    border-radius: ${radius.r20}px;
    padding: 2px 8px;
    white-space: nowrap;
    &::before {
      content: '';
      width: 5px;
      height: 5px;
      border-radius: ${radius.r4}px;
      background: ${color.brand};
    }
  `,
  security: css`
    margin-top: 28px;
    padding: 12px;
    background: ${color.brandBg};
    border: 1px solid ${color.brandLine3};
    border-radius: ${radius.md}px;
    display: flex;
    gap: 8px;
    font-size: ${font.size.body}px;
    color: ${color.brandInkDeep};
  `,
  error: css`
    color: ${color.danger};
    font-size: ${font.size.small}px;
    margin: -6px 0 12px;
  `,
  subLoose: css`
    line-height: 1.6;
    & b {
      color: ${color.text};
    }
  `,
  chans: css`
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  `,
  chan: css`
    flex: 1;
    padding: 12px 12px;
    border-radius: ${radius.lg}px;
    border: 2px solid ${color.border};
    background: ${color.surface};
    text-align: left;
    font-family: inherit;
    cursor: pointer;
    min-height: 44px;
    &:disabled {
      cursor: not-allowed;
    }
  `,
  chanOn: css`
    border-color: ${color.brand};
    background: ${color.brandBg};
  `,
  chanName: css`
    font-weight: ${font.weight.bold};
    font-size: ${font.size.body}px;
    color: ${color.text};
  `,
  chanSub: css`
    font-size: ${font.size.step}px;
    color: ${color.text3};
  `,
  subMid: css`
    margin-bottom: 16px;
  `,
  fieldLg: css`
    margin-bottom: 16px;
  `,
  backSm: css`
    margin-bottom: 16px;
  `,
  backLg: css`
    margin-bottom: 20px;
  `,
}));
