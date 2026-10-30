// Bong bóng tin nhắn + menu tin + thẻ AI gợi ý — prototype L1763–1810.
import { createStyles } from 'antd-style';
import { color, font, gradient, radius, shadow } from '@appchat/ui';

export const useBubbleStyles = createStyles(({ css, responsive }) => ({
  center: css`
    text-align: center;
    margin: 6px 0 12px;
  `,
  pill: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    padding: 2px 8px;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
  `,
  date: css`
    color: ${color.text3};
    font-weight: ${font.weight.semibold};
  `,
  dateWrap: css`
    text-align: center;
    margin-bottom: 16px;
  `,
  row: css`
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
    max-width: 78%;
    align-items: flex-end;
    position: relative;
    &:hover .msg-dots,
    &:focus-within .msg-dots {
      opacity: 1;
    }
    ${responsive.md} {
      max-width: 92%;
    }
  `,
  rowTop: css`
    align-items: flex-start;
    max-width: 76%;
  `,
  out: css`
    margin-left: auto;
    justify-content: flex-end;
    max-width: 72%;
    ${responsive.md} {
      max-width: 88%;
    }
  `,
  outAgent: css`
    flex-direction: row-reverse;
    justify-content: flex-start;
    max-width: 76%;
  `,
  av: css`
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: ${color.white};
    font-weight: ${font.weight.bold};
    font-size: ${font.scale.s12}px;
    flex-shrink: 0;
  `,
  avSm: css`
    font-size: ${font.scale.s10}px;
  `,
  avAgent: css`
    background: ${gradient.aiAgent};
  `,
  in: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 8px 12px;
    font-size: ${font.scale.s15}px;
    line-height: 1.5;
    color: ${color.text};
    min-width: 0;
    overflow-wrap: anywhere;
  `,
  inGroup: css`
    border-radius: ${radius.r4}px ${radius.r12}px ${radius.r12}px ${radius.r12}px;
    box-shadow: ${shadow.bubble};
    font-size: ${font.scale.s14}px;
  `,
  outBubble: css`
    background: ${color.bubbleOut};
    border-radius: ${radius.r12}px;
    padding: 8px 12px;
    font-size: ${font.scale.s15}px;
    line-height: 1.5;
    color: ${color.chatTitle};
    overflow-wrap: anywhere;
  `,
  agentBubble: css`
    background: ${color.bubbleAgent};
    border-radius: ${radius.r12}px ${radius.r4}px ${radius.r12}px ${radius.r12}px;
    font-size: ${font.scale.s14}px;
    color: ${color.text};
  `,
  sticker: css`
    padding: 12px 16px;
    font-size: ${font.scale.s32}px;
    text-align: center;
  `,
  sender: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    margin-bottom: 2px;
  `,
  stamp: css`
    font-size: ${font.scale.s11}px;
    color: ${color.text4};
    text-align: right;
    margin-top: 2px;
  `,
  stampOut: css`
    color: ${color.chatSub};
  `,
  /** Tên người gửi trong stamp tin ra ngoài (REQ-C13: "tin gửi đi hiện tên người gửi"). */
  senderOut: css`
    color: ${color.text2};
    font-weight: ${font.weight.bold};
  `,
  stampAgent: css`
    color: ${color.agentMeta};
  `,
  muted: css`
    font-style: italic;
    color: ${color.text4};
  `,
  photo: css`
    width: 150px;
    height: 110px;
    border-radius: ${radius.r8}px;
    background: ${gradient.photo};
    display: grid;
    place-items: center;
    color: ${color.white};
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.semibold};
    margin-bottom: 4px;
  `,
  pad8: css`
    padding: 8px;
  `,
  audio: css`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 180px;
    max-width: 60%;
  `,
  track: css`
    flex: 1;
    height: 3px;
    background: ${color.border};
    border-radius: ${radius.r4}px;
    position: relative;
    overflow: hidden;
  `,
  trackFill: css`
    width: 30%;
    height: 100%;
    background: ${color.brand};
  `,
  dur: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  insightWrap: css`
    display: flex;
    justify-content: center;
    margin: 4px 0 12px;
  `,
  insight: css`
    display: inline-flex;
    gap: 8px;
    align-items: center;
    background: ${color.surface};
    border: 1px dashed ${color.brandDash};
    padding: 6px 12px;
    border-radius: ${radius.r20}px;
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
    flex-wrap: wrap;
    justify-content: center;
  `,
  insightLabel: css`
    font-weight: ${font.weight.semibold};
    color: ${color.brandInk};
  `,
  card: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    overflow: hidden;
    box-shadow: ${shadow.card2};
    min-width: 220px;
  `,
  cardImg: css`
    height: 96px;
    background: ${gradient.productCard};
    display: grid;
    place-items: center;
  `,
  cardBody: css`
    padding: 12px;
  `,
  cardTitle: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  cardSub: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    margin: 2px 0 6px;
  `,
  cardPrice: css`
    font-size: ${font.scale.s16}px;
    font-weight: ${font.weight.heavy};
    color: ${color.brandInk};
  `,
  file: css`
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 200px;
  `,
  fileIcon: css`
    width: 34px;
    height: 34px;
    border-radius: ${radius.r8}px;
    background: ${color.dangerBg};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  fileName: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  fileMeta: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  typing: css`
    display: flex;
    gap: 4px;
    align-items: center;
    padding: 12px;
  `,
  typingDot: css`
    width: 6px;
    height: 6px;
    border-radius: ${radius.r4}px;
    background: ${color.text4};
  `,
  spacer: css`
    width: 28px;
    height: 28px;
    flex-shrink: 0;
  `,
  note: css`
    margin: 0 0 12px auto;
    max-width: 72%;
    background: ${color.alertBg};
    border: 1px dashed ${color.alertLine};
    border-radius: ${radius.r12}px;
    padding: 8px 12px;
    font-size: ${font.scale.s14}px;
    color: ${color.text};
  `,
  noteLabel: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.heavy};
    color: ${color.alertText};
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 2px;
  `,
  alert: css`
    margin: 4px 0 12px;
    border: 1px solid ${color.alertLine};
    background: ${color.alertBg};
    border-radius: ${radius.r12}px;
    padding: 8px 12px;
    display: flex;
    gap: 8px;
    align-items: flex-start;
  `,
  alertTitle: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.vipText};
  `,
  alertBody: css`
    font-size: ${font.scale.s13}px;
    color: ${color.alertText};
    line-height: 1.5;
    margin-top: 2px;
  `,
  /** Khối trích tin khi trả lời (REQ-C09 "Trả lời"). */
  quoted: css`
    border-left: 2px solid ${color.border};
    padding: 2px 8px;
    margin-bottom: 4px;
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
    opacity: 0.85;
  `,
  reactionBadge: css`
    display: inline-flex;
    margin-left: 6px;
    font-size: ${font.scale.s12}px;
  `,
}));
