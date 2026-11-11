// Tập người nhận niêm phong của một ý định (TIP-006b §2.3–2.4): lần đầu xử lý event → chọn cohort thành viên active (theo danh sách /
// quyền hiện tại) → dàn vào fanout (`notify:<chỉ số ý định>`) → niêm phong cùng transaction. Phát lại KHÔNG thêm người mới (vào workspace
// sau đó); người đã chọn vẫn kiểm quyền HIỆN TẠI trước mỗi hiệu ứng (bị gỡ / mất quyền → bỏ). Owner hiện tại (`ownerOnly`) là mục tiêu biểu
// tượng — không chụp cohort.
import type { TenantTx } from '../../kernel/actions/action-context';
import { leaseSelection, openFanout, sealSelection, stageTargets } from '../../kernel/events/fanout';
import type { Recipient } from '../services/recipients';

/** Trả tập id đã niêm phong của ý định (chọn + niêm phong nếu lần đầu). */
export async function sealedRecipients(tx: TenantTx, eventId: string, index: number, current: readonly Recipient[]): Promise<Set<string>> {
  const f = await openFanout(tx, { eventId, consumer: `notify:${index}`, contractVersion: 1 });
  if (f.phase !== 'sealed') {
    // Dòng fanout khoá FOR UPDATE trong transaction này → thuê luôn được; chọn = người nhận hiện tại (đã sắp theo user_id).
    const l = (await leaseSelection(tx, f.id))!;
    await stageTargets(tx, f.id, l, current.map((r) => ({ kind: 'user', id: r.userId })), 0, null);
    if (!(await sealSelection(tx, f.id, l))) throw new Error('notify: niêm phong người nhận thất bại');
  }
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT i.target_id::text AS id FROM event_fanout f JOIN event_fanout_item i ON i.fanout_id = f.id AND i.generation = f.selection_generation
     WHERE f.id = ${f.id}::uuid AND f.selection_phase = 'sealed'`;
  return new Set(rows.map((r) => r.id));
}
