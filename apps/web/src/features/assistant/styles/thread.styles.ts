// Luồng hội thoại Trợ lý: bong bóng, thẻ xác nhận / kết quả, "đang soạn" — prototype L1256–1300.
import { createStyles, keyframes } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

const pulse = keyframes`
  0%, 100% { opacity: .35; transform: scale(.85); }
  50% { opacity: 1; transform: scale(1); }
`;

export const useThreadStyles = createStyles(({ css, responsive }) => ({
  scroll: css`
    flex: 1;
    overflow-y: auto;
    padding: 20px 24px;
    ${responsive.md} {
      padding: 16px 12px;
    }
  `,
  list: css`
    max-width: 760px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
  `,
  userRow: css`
    display: flex;
    justify-content: flex-end;
  `,
  user: css`
    max-width: 80%;
    padding: 8px 12px;
    border-radius: ${radius.r12}px ${radius.r12}px ${radius.r4}px ${radius.r12}px;
    background: ${color.brand};
    color: ${color.white};
    font-size: ${font.scale.s15}px;
    line-height: 1.55;
    white-space: pre-wrap;
  `,
  aiRow: css`
    display: flex;
    gap: 8px;
  `,
  avatar: css`
    flex-shrink: 0;
    margin-top: 2px;
    width: 34px;
    height: 34px;
  `,
  aiCol: css`
    max-width: 82%;
    min-width: 0;
  `,
  aiName: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.tealInk};
    margin-bottom: 4px;
  `,
  ai: css`
    padding: 12px 16px;
    border-radius: ${radius.r4}px ${radius.r12}px ${radius.r12}px ${radius.r12}px;
    background: ${color.surface};
    border: 1px solid ${color.border};
    font-size: ${font.scale.s15}px;
    line-height: 1.6;
    color: ${color.text};
    white-space: pre-wrap;
  `,
  card: css`
    margin-top: 8px;
    border: 1px solid;
    border-radius: ${radius.r12}px;
    overflow: hidden;
    max-width: 380px;
    background: ${color.surface};
  `,
  cardHead: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
  `,
  cardIcon: css`
    width: 32px;
    height: 32px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  cardTitle: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.heavy};
  `,
  cardDesc: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
    line-height: 1.4;
  `,
  cardFoot: css`
    display: flex;
    gap: 8px;
    padding: 8px 12px;
    border-top: 1px solid ${color.divider};
  `,
  ok: css`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: ${color.brand};
    color: ${color.white};
    border-radius: ${radius.r6}px;
    padding: 8px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    border: none;
    font-family: inherit;
    ${responsive.md} {
      min-height: 44px;
    }
  `,
  no: css`
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text4};
    border-radius: ${radius.r6}px;
    padding: 8px 12px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    cursor: pointer;
    font-family: inherit;
    ${responsive.md} {
      min-height: 44px;
    }
  `,
  done: css`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    border: none;
    border-top: 1px solid ${color.divider};
    cursor: pointer;
    font-family: inherit;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    ${responsive.md} {
      min-height: 44px;
    }
  `,
  cancelled: css`
    padding: 8px 12px;
    border-top: 1px solid ${color.divider};
    font-size: ${font.scale.s14}px;
    color: ${color.text4};
  `,
  typing: css`
    padding: 12px 16px;
    border-radius: ${radius.r4}px ${radius.r12}px ${radius.r12}px ${radius.r12}px;
    background: ${color.surface};
    border: 1px solid ${color.border};
    display: flex;
    gap: 4px;
    & > span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: ${color.checkLine};
      animation: ${pulse} 1.8s ease-in-out infinite;
    }
  `,
  foot: css`
    padding: 12px 16px 16px;
    border-top: 1px solid ${color.border};
    background: ${color.asstFoot};
    flex-shrink: 0;
    ${responsive.md} {
      padding: 8px;
    }
  `,
  footInner: css`
    width: 100%;
    max-width: 680px;
    margin: 0 auto;
  `,
}));
