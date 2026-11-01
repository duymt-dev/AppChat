// Luật chuyển sang người của agent trực kênh (Blueprint §5.3 bước 4, agent-gateway §7): ưu tiên theo thứ tự — lý do đầu tiên khớp
// được ghi vào `conversation.handoff_reason` (mã ổn định, FE dịch).
import type { AgentReply } from './output';

export type HandoffReason = 'needs_human' | 'asked_human' | 'banned_word' | 'complaint' | 'repeated' | 'low_confidence' | 'no_reply' | 'unreadable';

export interface HandoffInput {
  out: AgentReply & { ok: boolean };
  /** Ngưỡng agent (50–95, %). */
  threshold: number;
  /** Tin khách gần nhất (đã gom) — đã bỏ dấu, chữ thường (`foldText`). */
  lastCustomerFolded: string;
  /** Các tin khách trước đó (đã fold), mới nhất trước — đếm lặp câu hỏi. */
  previousCustomerFolded: string[];
  /** Từ cấm governance (đã fold). */
  banned: string[];
  /** Câu trả lời đã fold. */
  replyFolded: string;
}

const ASK_HUMAN = /\b(gap|noi chuyen voi|cho (toi|em|minh) (gap|noi chuyen)|chuyen) (nguoi that|nhan vien|tu van vien|quan ly|chu shop|admin)\b|\b(human|real person|talk to (a )?(person|human|agent|staff))\b/;
const COMPLAINT = /\b(khieu nai|to cao|lua dao|boc phot|that vong|qua te|te hai|hoan tien ngay|complain|refund now|scam)\b/;

const norm = (s: string) => s.replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim();

export function decideHandoff(i: HandoffInput): HandoffReason | null {
  if (!i.out.ok) return 'unreadable';
  if (i.out.needs_human) return 'needs_human';
  if (ASK_HUMAN.test(i.lastCustomerFolded)) return 'asked_human';
  if (i.banned.some((w) => w && (i.lastCustomerFolded.includes(w) || i.replyFolded.includes(w)))) return 'banned_word';
  if (i.out.sentiment === 'negative' || COMPLAINT.test(i.lastCustomerFolded)) return 'complaint';
  const q = norm(i.lastCustomerFolded);
  if (q && i.previousCustomerFolded.slice(0, 2).filter((p) => norm(p) === q).length >= 2) return 'repeated';
  if (i.out.confidence * 100 < i.threshold) return 'low_confidence';
  if (!i.out.reply) return 'no_reply';
  return null;
}
