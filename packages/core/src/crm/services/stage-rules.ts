// Giai đoạn khách tự động theo chứng từ (COMMERCE §8): chỉ NÂNG lên mốc của chứng từ khi khách đang thấp hơn; `lùi về Đang tư vấn`
// khi báo giá bị từ chối / hết hạn mà không còn báo giá mở. Khách Đã mua không bao giờ bị hạ; kéo tay trong 24 giờ thì quy tắc tự động
// không ghi đè. Chạy trong transaction của chứng từ (cùng action / job) → event `contact.stage_changed` (manual: false) + timeline.
import type { TenantTx } from '../../kernel/actions/action-context';
import { writeTimeline } from './timeline.service';

const ORDER = ['lead', 'potential', 'consulting', 'quote', 'contract', 'won'] as const;
type Stage = (typeof ORDER)[number] | 'lost';
const MANUAL_HOLD_MS = 24 * 3_600_000;

const rank = (s: string) => (s === 'lost' ? -1 : ORDER.indexOf(s as (typeof ORDER)[number]));

export interface StageRule {
  contactId: string;
  /** `raise` = nâng tới `to` nếu đang thấp hơn; `fallback` = lùi về `to` nếu đang ở mốc cao hơn nhưng chưa Đã mua. */
  mode: 'raise' | 'fallback';
  to: Stage;
  actor: { type: string; id: string | null };
  now: Date;
}

/** Áp luật → event để handler / job ghi outbox (rỗng = không đổi). */
export async function applyStageRule(tx: TenantTx, r: StageRule): Promise<{ topic: string; payload: Record<string, unknown> }[]> {
  const c = await tx.contact.findUnique({ where: { id: r.contactId }, select: { id: true, stage: true, stageSetManuallyAt: true, deletedAt: true } });
  if (!c || c.deletedAt || c.stage === 'won') return [];
  if (c.stageSetManuallyAt && r.now.getTime() - c.stageSetManuallyAt.getTime() < MANUAL_HOLD_MS) return [];
  const cur = rank(c.stage);
  const want = rank(r.to);
  const move = r.mode === 'raise' ? cur < want : cur > want && c.stage !== 'lost';
  if (!move) return [];
  const n = await tx.contact.updateMany({ where: { id: c.id, stage: c.stage }, data: { stage: r.to } });
  if (!n.count) return [];
  await writeTimeline(tx, { contactId: c.id, type: 'stage', key: 'stage', params: { from: c.stage, to: r.to }, actor: r.actor, at: r.now });
  return [{ topic: 'contact.stage_changed', payload: { contact_id: c.id, from: c.stage, to: r.to, manual: false } }];
}
