// Phát lại kết quả một lượt đã claim (TIP-023c SPEC vận hành): request_id trùng + cùng input → trả đúng run cũ, dựng sự kiện từ tin đã lưu
// (không gọi model, không chạy action). Run còn đang chạy → trả run_id + sự kiện có sẵn; client nối SSE theo run_id để nhận tiếp.
// Lượt mới chạy ở ROLE=ai: API trả JSON cũng dựng từ tin đã lưu (`commands` — lần đầu, kèm lệnh UI), cùng thứ tự như lúc chạy.
import type { TenantDb } from '@appchat/db';
import type { TurnEventDto } from '@appchat/shared';
import type { Part } from '../sessions';
import type { StoredUiPart } from './history';

type Db = Pick<TenantDb, 'assistantMessage'>;

/** Sự kiện của run từ tin Trợ lý đã lưu (thứ tự ghi). Phần `ui` cần trình bày theo người xem → `present`. */
export async function replayEvents(db: Db, runId: string, present: (p: StoredUiPart) => Promise<TurnEventDto>, o: { commands?: boolean } = {}): Promise<TurnEventDto[]> {
  const rows = await db.assistantMessage.findMany({ where: { runId, role: 'assistant' }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { content: true } });
  const out: TurnEventDto[] = [];
  for (const r of rows) {
    for (const p of ((r.content ?? {}) as { parts?: Part[] }).parts ?? []) {
      if (p.type === 'text') out.push({ type: 'delta', text: p.text });
      else if (p.type === 'card' && p.status === 'pending') out.push(p.card);
      else if (p.type === 'ui') out.push(await present(p));
      // ui_command đã chạy lúc phát lần đầu — phát lại không lặp hành vi giao diện; chỉ trả ở lần đầu (lượt chạy ở worker, API trả JSON).
      else if (p.type === 'ui_command' && o.commands) out.push({ type: 'ui_command', command: p.command });
    }
  }
  return out;
}
