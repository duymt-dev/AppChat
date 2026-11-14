// Tham chiếu tin Zalo (TIP-014b A — zca-js 2.2.0): msgId / cliMsgId trong payload là chuỗi số; SDK gọi `parseInt` khi thả cảm xúc,
// nên id vượt Number.MAX_SAFE_INTEGER sẽ mất chính xác → coi là không an toàn, không gọi kênh (cách ly, không String(number)).
// Cảm xúc AppChat (enum `message.react`) ↔ mã `Reactions` của SDK; mã lạ từ kênh → null (không tự bịa emoji).
import { ChannelOperationError, type ProviderMessageRef, type ReactionEmoji } from '../operations';

const DIGITS = /^[0-9]{1,20}$/;

/** Id Zalo hợp lệ: chuỗi số không rỗng. Số (number) chỉ nhận khi là số nguyên an toàn (chưa mất chính xác). */
export function zaloId(v: unknown): string | null {
  if (typeof v === 'string') return DIGITS.test(v) ? v : null;
  if (typeof v === 'number') return Number.isSafeInteger(v) && v > 0 ? String(v) : null;
  return null;
}

/** Id an toàn để SDK `parseInt` (không vượt MAX_SAFE_INTEGER). */
export const safeForSdk = (id: string) => DIGITS.test(id) && Number.isSafeInteger(Number(id));

/** Tham chiếu đủ để gọi lệnh: thiếu cliMsgId → pending_ref; id không an toàn → unsafe_ref. Không bao giờ đoán. */
export function assertCallable(ref: ProviderMessageRef): { msgId: string; cliMsgId: string } {
  if (!ref.cliMsgId) throw new ChannelOperationError('pending_ref');
  if (!safeForSdk(ref.msgId) || !safeForSdk(ref.cliMsgId)) throw new ChannelOperationError('unsafe_ref');
  return { msgId: ref.msgId, cliMsgId: ref.cliMsgId };
}

/** Mã cảm xúc của zca-js (`Reactions` — models/Reaction.d.ts) cho 6 emoji AppChat. NONE = "" = gỡ. */
export const ZALO_REACTION: Record<ReactionEmoji, string> = {
  '👍': '/-strong',
  '❤️': '/-heart',
  '😂': ':>',
  '😮': ':o',
  '😢': ':-((',
  '🙏': '_()_',
};
export const ZALO_REACTION_NONE = '';

const BY_CODE = new Map(Object.entries(ZALO_REACTION).map(([e, c]) => [c, e as ReactionEmoji]));

/** Mã từ kênh → emoji AppChat; "" = gỡ (null); mã ngoài 6 emoji → undefined (bỏ qua, không ghi đè). */
export function emojiOfZalo(code: string): ReactionEmoji | null | undefined {
  if (code === ZALO_REACTION_NONE) return null;
  return BY_CODE.get(code);
}
