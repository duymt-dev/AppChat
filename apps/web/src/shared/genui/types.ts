// Kiểu của renderer GenUI (standards/ai/generative-ui.md — D55, TIP-023c G1): cây + run + refs (đã lọc theo quyền người xem) + intent
// (đường dẫn node → handle server ký). Chế độ `compact` (drawer ~400px) / `full` (màn Trợ lý, modal "Mở rộng").
import type { ReactNode } from 'react';
import type { GenUiPart, UiBlock, UiCommand } from '@appchat/shared';

export type GenUiMode = 'compact' | 'full';

/** Ref server không trả được (mất quyền / không có bước) — renderer hiện "Không có dữ liệu", không đoán số. */
export const isUnavailable = (v: unknown): boolean => v === undefined || (!!v && typeof v === 'object' && (v as { unavailable?: unknown }).unavailable === true);

export interface GenUiCtx {
  part: GenUiPart;
  mode: GenUiMode;
  /** Giá trị ref (đã lọc theo quyền) — `undefined` / `{unavailable:true}` = không có dữ liệu. */
  ref: (r: { $ref: string } | undefined) => unknown;
  /** Handle intent của node action (không có = người xem không còn quyền / action không còn → ẩn nút). */
  intent: (path: string) => string | undefined;
  /** Lệnh UI (không đổi dữ liệu) → UI Command Bus. */
  onUi: (cmd: UiCommand) => void;
  /** Có phần bị cắt ở compact → hiện nút "Mở rộng" (modal full, cùng cây — không gọi LLM). */
  onExpand?: () => void;
  /** Kết quả ngoài đã được server xác minh (QR đã kết nối → assistant.resume xong) — màn chứa cây gửi tiếp lượt cho Trợ lý. */
  onExternal?: (e: { node: string; status: 'connected' }) => void;
  /** Dựng khối con (bố cục đệ quy) — registry cấp qua context để khối không import ngược registry. */
  renderBlock: (block: UiBlock, path: string) => ReactNode;
}

export interface BlockProps<T extends UiBlock = UiBlock> {
  block: T;
  /** Đường dẫn node trong cây ("" = gốc, "0.2") — khoá intent. */
  path: string;
}

export type BlockOf<K extends UiBlock['type']> = Extract<UiBlock, { type: K }>;
