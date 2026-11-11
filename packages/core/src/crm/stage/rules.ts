// Giai đoạn khách tự động theo chứng từ (COMMERCE §8; TIP-015g §1): chỉ NÂNG lên mốc của chứng từ khi khách đang thấp hơn; lùi về
// `Đang tư vấn` khi báo giá bị từ chối / hết hạn mà họ khách không còn báo giá mở. Đã mua không bao giờ bị hạ; kéo tay trong 24 giờ thì
// tự động không ghi đè (đúng 24 giờ = hết giữ; mốc tương lai do đồng hồ lùi = vẫn giữ). Producer đã khoá họ khách chuẩn TRƯỚC chứng từ
// (ràng buộc stage/types.ts); đọc + so trên dòng ĐÃ khoá, rồi UPDATE có điều kiện id + version + stage + còn sống + mốc giữ so bằng
// timestamptz trong SQL (không cắt micro giây). Không đổi / bị giữ → [] (chứng từ vẫn chuyển); không bao giờ xoá / làm mới mốc kéo tay.
import type { TenantTx } from '../../kernel/actions/action-context';
import { writeTimeline } from '../services/timeline.service';
import { stageBinding, type AutoStage } from './types';

const ORDER = ['lead', 'potential', 'consulting', 'quote', 'contract', 'won'] as const;
export const MANUAL_HOLD_MS = 86_400_000;

const rank = (s: string) => (s === 'lost' ? -1 : ORDER.indexOf(s as (typeof ORDER)[number]));

export interface StageRule {
  contactId: string;
  /** `raise` = nâng tới `to` nếu đang thấp hơn; `fallback` = lùi về `to` nếu đang ở mốc cao hơn nhưng chưa Đã mua. */
  mode: 'raise' | 'fallback';
  to: AutoStage;
  actor: { type: string; id: string | null };
  now: Date;
}

/** Mốc cắt giữ: kéo tay SAU mốc này (now − 24h) còn được giữ. Thời lượng tuyệt đối, không theo múi giờ / DST. */
export const holdCutoff = (now: Date) => new Date(now.getTime() - MANUAL_HOLD_MS);

/** Luật hạng hiện có: có đổi từ `stage` sang `to` theo `mode` không (Đã mua không bao giờ bị đụng). */
export function wantsMove(stage: string, mode: StageRule['mode'], to: AutoStage): boolean {
  if (stage === 'won') return false;
  const cur = rank(stage);
  const want = rank(to);
  return mode === 'raise' ? cur < want : cur > want && stage !== 'lost';
}

type Row = { stage: string; version: number; held: boolean };

/** Áp luật → event để handler / job ghi outbox cùng transaction (rỗng = không đổi). */
export async function applyStageRule(tx: TenantTx, r: StageRule): Promise<{ topic: string; payload: Record<string, unknown> }[]> {
  const { rootId } = stageBinding(tx, r.contactId);
  if (!rootId) return [];
  // Tham số thời gian truyền dạng chữ ISO + ::timestamptz — Date JS trong raw SQL bị đọc theo múi giờ phiên (lệch giờ).
  const cutoff = holdCutoff(r.now).toISOString();
  const now = r.now.toISOString();
  const [c] = await tx.$queryRaw<Row[]>`
    SELECT stage::text AS stage, version, (stage_set_manually_at IS NOT NULL AND stage_set_manually_at > ${cutoff}::timestamptz) AS held
      FROM contact WHERE id = ${rootId}::uuid AND deleted_at IS NULL AND merged_into_id IS NULL`;
  if (!c || c.held || !wantsMove(c.stage, r.mode, r.to)) return [];
  const moved = await tx.$queryRaw<{ version: number }[]>`
    UPDATE contact SET stage = ${r.to}::contact_stage, updated_at = ${now}::timestamptz
     WHERE id = ${rootId}::uuid AND version = ${c.version} AND stage = ${c.stage}::contact_stage AND deleted_at IS NULL AND merged_into_id IS NULL
       AND (stage_set_manually_at IS NULL OR stage_set_manually_at <= ${cutoff}::timestamptz)
     RETURNING version`;
  if (!moved.length) return [];
  await writeTimeline(tx, { contactId: rootId, type: 'stage', key: 'stage', params: { from: c.stage, to: r.to }, actor: r.actor, at: r.now });
  return [{ topic: 'contact.stage_changed', payload: { contact_id: rootId, from: c.stage, to: r.to, manual: false } }];
}
