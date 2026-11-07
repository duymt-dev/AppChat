// Thông báo ví (TIP-039 pha 2, AC06) — logic thuần của BillingNoticeHost: realtime `billing.notice` + lỗi 402 CREDIT_EXHAUSTED của useAction
// → một thông báo đang hiện mỗi workspace, chống trùng theo `event_id` (cùng event đến lại / nhiều tab không bật popup lần hai). `restored`
// thay thông báo hết Credit bằng "dùng AI lại được" (không tự gửi / chạy lại tin cũ). PLAN_LIMIT_REACHED KHÔNG phải hết Credit — không vào đây.
import { create } from 'zustand';

export type NoticeKind = 'low' | 'exhausted' | 'restored';

export interface BillingNotice {
  kind: NoticeKind;
  level?: 80 | 95;
  /** Khoá chống trùng: id event outbox (realtime) hoặc `local:<thời điểm>` (402 từ action). */
  key: string;
  workspace: string | null;
}

interface NoticeState {
  current: BillingNotice | null;
  seen: string[];
  push: (n: BillingNotice) => void;
  dismiss: () => void;
  /** Đổi workspace / đăng xuất — bỏ thông báo của workspace cũ. */
  reset: (workspace: string | null) => void;
}

const SEEN_MAX = 50;

/** Thông báo kế tiếp: bỏ nếu đã thấy key; `restored` chỉ hiện khi đang có (hoặc vừa có) thông báo hết Credit. */
export function nextNotice(
  cur: BillingNotice | null,
  seen: readonly string[],
  n: BillingNotice,
): BillingNotice | null | undefined {
  if (seen.includes(n.key)) return undefined;
  if (cur && cur.workspace !== n.workspace) return n.kind === 'restored' ? undefined : n;
  if (n.kind === 'restored') return cur?.kind === 'exhausted' ? n : undefined;
  // Hết Credit ưu tiên hơn nhắc mức: đang hiện "hết" thì không đè bằng nhắc 80 / 95.
  if (n.kind === 'low' && cur?.kind === 'exhausted') return undefined;
  // Cùng loại liên tiếp (nhiều lỗi 402 trong một phiên) — không bật lại.
  if (cur && cur.kind === n.kind && cur.level === n.level) return undefined;
  return n;
}

export const useBillingNotices = create<NoticeState>((set) => ({
  current: null,
  seen: [],
  push: (n) =>
    set((s) => {
      const next = nextNotice(s.current, s.seen, n);
      const seen = [...s.seen, n.key].slice(-SEEN_MAX);
      return next === undefined ? { seen } : { current: next, seen };
    }),
  dismiss: () => set({ current: null }),
  reset: (workspace) => set((s) => (s.current && s.current.workspace !== workspace ? { current: null } : {})),
}));

/** Đọc gói tin realtime `billing.notice` (dữ liệu lạ → bỏ qua). */
export function noticeFromEvent(data: unknown, workspace: string | null): BillingNotice | null {
  const d = data as { kind?: string; level?: number; event_id?: string } | null;
  if (!d?.event_id || (d.kind !== 'low' && d.kind !== 'exhausted' && d.kind !== 'restored')) return null;
  const level = d.level === 80 || d.level === 95 ? d.level : undefined;
  if (d.kind === 'low' && !level) return null;
  return { kind: d.kind, ...(level ? { level } : {}), key: d.event_id, workspace };
}
