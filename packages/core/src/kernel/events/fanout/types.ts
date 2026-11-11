// Fanout bền theo event (TIP-006b §1.1, §2): một (event, consumer, version) → một dòng `event_fanout`; tập mục tiêu chọn MỘT lần dưới
// một thế hệ chọn rồi niêm phong — phát lại / tiếp quản dùng lại đúng tập đó, không thêm mục tiêu sinh sau lúc chọn. Chỉ thế hệ đã
// niêm phong mới có hiệu ứng; mỗi mục một kết cục (applied / no_effect / handed_off / unknown) ghi cùng transaction hiệu ứng.

export interface FanoutKey {
  eventId: string;
  consumer: string;
  contractVersion: number;
}

export type FanoutPhase = 'building' | 'sealed' | 'abandoned';
export type ItemPhase = 'pending' | 'applied' | 'no_effect' | 'handed_off' | 'unknown';

export interface FanoutRow {
  id: string;
  generation: number;
  phase: FanoutPhase;
  selected: number;
  processed: number;
}

/** Mục tiêu chọn được (chỉ kiểu + id + phiên bản đã chụp — không chép payload / thân / email). */
export interface FanoutTarget {
  kind: string;
  id: string;
  version?: string;
}

export interface FanoutItem {
  kind: string;
  id: string;
  version: string;
  ordinal: number;
}

export type ItemOutcome = { phase: Exclude<ItemPhase, 'pending'>; operationRef?: string | null; reason?: string | null; digest?: string | null };

/** Trang ≤ 100 mục chờ mỗi lượt xử lý (§2.1). */
export const FANOUT_PAGE = 100;
/** Thuê tiến trình chọn (giây) — tiếp quản khi hết hạn, fence chặn người cũ niêm phong. */
export const FANOUT_LEASE_SEC = 120;
