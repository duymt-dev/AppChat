// Liên kết chứng từ → cơ hội (TIP-026c §1.2, §3.1): báo giá / đơn / lịch hẹn trỏ TỚI cơ hội (cột nullable, không FK xuyên domain — kiểm ở
// đây). Hợp lệ khi: cơ hội tồn tại, chưa lưu trữ, CÙNG HỌ khách với chứng từ, chưa Thua (422 `opportunity_lost`), người gọi thấy khách của
// cơ hội. Sai → 422 chung `opportunity_id: invalid` (không lộ tồn tại). Còn chứng từ sống (đơn chưa huỷ / hợp đồng đã ký) chặn Thua / lưu trữ.
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { familyIds } from '../lifecycle/lock';
import { UUID, visibleContact } from '../services/access';

const INVALID = () => new AppError('VALIDATION_FAILED', 422, { opportunity_id: 'invalid' });

/** Kiểm `opportunityId` gắn được vào chứng từ của khách `contactId` (khách lưu trên chứng từ — có thể là nguồn đã gộp). null / undefined → null. */
export async function checkOpportunityLink(tx: TenantTx, authz: AuthzContext, contactId: string, opportunityId: string | null | undefined): Promise<string | null> {
  if (!opportunityId) return null;
  if (!UUID.test(opportunityId)) throw INVALID();
  const o = await tx.contactOpportunity.findUnique({ where: { id: opportunityId }, select: { contactId: true, stage: true, archivedAt: true } });
  if (!o || o.archivedAt) throw INVALID();
  const fam = await familyIds(tx, o.contactId);
  if (!fam.includes(contactId) && !(await familyIds(tx, contactId)).includes(o.contactId)) throw INVALID();
  await visibleContact(tx, authz, o.contactId).catch(() => {
    throw INVALID();
  });
  if (o.stage === 'lost') throw new AppError('VALIDATION_FAILED', 422, { opportunity_id: 'opportunity_lost' });
  return opportunityId;
}

/** Cơ hội của chứng từ nguồn đã Thua → 422 `opportunity_lost` (phải Mở lại trước khi tạo đơn / hợp đồng từ đó). */
export async function assertNotLost(tx: TenantTx, opportunityId: string | null | undefined): Promise<void> {
  if (!opportunityId) return;
  const o = await tx.contactOpportunity.findUnique({ where: { id: opportunityId }, select: { stage: true } });
  if (o?.stage === 'lost') throw new AppError('VALIDATION_FAILED', 422, { opportunity_id: 'opportunity_lost' });
}

/** Cơ hội của hợp đồng — đi qua báo giá nguồn (`contract.quote_id → quote.opportunity_id`); hợp đồng không từ báo giá → null. */
export async function opportunityOfQuote(tx: TenantTx, quoteId: string | null | undefined): Promise<string | null> {
  if (!quoteId) return null;
  return (await tx.quote.findUnique({ where: { id: quoteId }, select: { opportunityId: true } }))?.opportunityId ?? null;
}

/** Cơ hội mở DUY NHẤT của khách (null khi 0 hoặc ≥ 2) — gắn tự động cho nguồn ngoài (cuộc gọi, TIP Call Center sau). */
export async function soleOpenOpportunity(tx: TenantTx, contactId: string): Promise<string | null> {
  const rows = await tx.contactOpportunity.findMany({ where: { contactId, archivedAt: null, stage: { notIn: ['won', 'lost'] } }, select: { id: true }, take: 2 });
  return rows.length === 1 ? rows[0]!.id : null;
}

/** Chứng từ sống của cơ hội: đơn chưa huỷ hoặc hợp đồng đã ký (qua báo giá nguồn). */
export async function liveDocuments(tx: TenantTx, opportunityId: string): Promise<{ order: boolean; signed: boolean }> {
  const [r] = await tx.$queryRaw<{ order: boolean; signed: boolean }[]>`
    SELECT EXISTS (SELECT 1 FROM "order" o WHERE o.opportunity_id = ${opportunityId}::uuid AND o.deleted_at IS NULL AND o.status <> 'cancelled') AS order,
           EXISTS (SELECT 1 FROM contract k JOIN quote q ON q.id = k.quote_id
                    WHERE q.opportunity_id = ${opportunityId}::uuid AND k.deleted_at IS NULL AND k.status = 'signed') AS signed`;
  return { order: !!r?.order, signed: !!r?.signed };
}

/** Thua / lưu trữ bị chặn khi còn chứng từ sống → 409 `has_live_document`. */
export async function assertNoLiveDocument(tx: TenantTx, opportunityId: string): Promise<void> {
  const d = await liveDocuments(tx, opportunityId);
  if (d.order || d.signed) throw new AppError('CONFLICT', 409, { opportunity_id: 'has_live_document' });
}
