// Cổng nạp nội dung tệp vào tin gửi model (TIP-023f §3.1-3.2): tin lưu chỉ THAM CHIẾU có kiểu (`appchat-input`: artifact_id +
// revision), không bytes / URL. Ngay trước MỖI lời gọi thật, engine nhờ resolver (core cài — kiểm quyền / nguồn / privacy hiện hành)
// dựng phần chữ + ảnh inline có giới hạn. packages/ai không biết DB / core. Tham chiếu không còn hợp lệ → phần chữ "không khả dụng"
// tường minh, không dùng lại bytes cũ. Có ảnh → chỉ ứng viên route khai vision.
import type { InputRefPart, InputResolver, RunMessage } from './types';

export type { HydratedPart, InputRefPart, InputResolver } from './types';

export const isInputRef = (p: unknown): p is InputRefPart => !!p && typeof p === 'object' && (p as { type?: unknown }).type === 'appchat-input' && typeof (p as { artifact_id?: unknown }).artifact_id === 'string';

/** Mọi tham chiếu trong lịch sử (theo thứ tự xuất hiện). */
export function inputRefsOf(messages: readonly RunMessage[]): InputRefPart[] {
  const out: InputRefPart[] = [];
  for (const m of messages) if (m.role === 'user' && Array.isArray(m.content)) for (const p of m.content as unknown[]) if (isInputRef(p)) out.push(p);
  return out;
}

/** Thay tham chiếu bằng phần đã dựng (bản sao — mảng gốc lưu trạng thái giữ nguyên tham chiếu, không bao giờ chứa bytes). */
export async function hydrateMessages(messages: readonly RunMessage[], resolver: InputResolver | null | undefined): Promise<{ messages: RunMessage[]; vision: boolean }> {
  const refs = inputRefsOf(messages);
  if (!refs.length) return { messages: [...messages], vision: false };
  const parts = resolver ? await resolver.hydrate(refs) : refs.map(() => [{ type: 'text' as const, text: '[attachment unavailable]' }]);
  let i = 0;
  let vision = false;
  const out = messages.map((m) => {
    if (m.role !== 'user' || !Array.isArray(m.content) || !(m.content as unknown[]).some(isInputRef)) return m;
    const content = (m.content as unknown[]).flatMap((p) => {
      if (!isInputRef(p)) return [p];
      const h = parts[i++] ?? [];
      for (const x of h) if (x.type === 'image') vision = true;
      return h.map((x) => (x.type === 'image' ? { type: 'image', image: x.image, mediaType: x.mediaType } : { type: 'text', text: x.text }));
    });
    return { ...m, content };
  });
  return { messages: out, vision };
}

/** Bỏ bytes khỏi tin trả về từ SDK trước khi lưu (phòng hờ — phần ảnh chỉ có trong bản sao gửi đi, không vào tin lưu). */
export function stripMedia(messages: readonly RunMessage[]): RunMessage[] {
  return messages.map((m) =>
    Array.isArray(m.content) ? { ...m, content: (m.content as { type?: string }[]).map((p) => (p.type === 'image' || p.type === 'file' ? { type: 'text', text: '[media omitted]' } : p)) } : m,
  );
}
