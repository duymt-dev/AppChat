// Truy cập bảng chiến dịch (TIP-037): khoá dòng + kiểm version / trạng thái, lịch sử append-only, payload event chỉ id. Không bảng nào ở
// đây có workspace_id (DB riêng mỗi workspace). Quyền marketing đã kiểm ở executor; chiến dịch không có chủ sở hữu theo dòng (Blueprint
// §3.5 — campaign.view / manage / approve áp cho cả module).
import { AppError, CAMPAIGN_FLOW, assertTransition, assertVersion, type CampaignStatusKey } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { actorUserId, type CrmMembers } from '../../crm/public';

export type CampaignRow = NonNullable<Awaited<ReturnType<TenantTx['campaign']['findUnique']>>>;
export type Ev = { topic: string; payload: Record<string, unknown> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Khoá chiến dịch (FOR UPDATE) + kiểm version. Không có / đã xoá → 404. */
export async function lockCampaign(tx: TenantTx, id: string, ifVersion?: number | null): Promise<CampaignRow> {
  const rows = UUID.test(id) ? await tx.$queryRaw<{ id: string }[]>`SELECT id FROM campaign WHERE id = ${id}::uuid AND deleted_at IS NULL FOR UPDATE` : [];
  const c = rows[0] ? await tx.campaign.findUnique({ where: { id } }) : null;
  if (!c) throw new AppError('NOT_FOUND', 404, { campaign_id: 'not_found' });
  assertVersion(c.version, ifVersion);
  return c;
}

export async function findCampaign(tx: TenantTx, id: string): Promise<CampaignRow> {
  const c = UUID.test(id) ? await tx.campaign.findUnique({ where: { id } }) : null;
  if (!c || c.deletedAt) throw new AppError('NOT_FOUND', 404, { campaign_id: 'not_found' });
  return c;
}

export const stepOf = (c: Pick<CampaignRow, 'status'>, action: string): CampaignStatusKey => assertTransition(CAMPAIGN_FLOW, c.status as CampaignStatusKey, action);

/** Payload event vòng đời — chỉ id / mã / trạng thái (không nội dung, không PII). */
export const changed = (topic: string, c: Pick<CampaignRow, 'id' | 'code' | 'status' | 'version'>, actor: string | null): Ev => ({
  topic,
  payload: { campaign_id: c.id, code: c.code, status: c.status, version: c.version, actor_user_id: actor },
});

export interface Actor {
  userId: string | null;
  name: string;
}

export async function actorOf(ctx: ActionContext, members: Pick<CrmMembers, 'names'>): Promise<Actor> {
  const uid = actorUserId(ctx);
  if (!uid) return { userId: null, name: ctx.actor.type === 'system' ? 'system' : '' };
  return { userId: uid, name: (await members.names([uid])).get(uid) ?? '' };
}

/** Lịch sử append-only — không sửa / xoá dòng cũ (kể cả khi hoàn tác: ghi dòng mới `undo`). */
export async function logEvent(tx: TenantTx, campaignId: string, kind: string, actor: Actor, now: Date, detail: Record<string, unknown> = {}) {
  await tx.campaignEvent.create({ data: { id: uuidv7(now.getTime()), campaignId, kind, actorUserId: actor.userId, actorName: actor.name, detail: detail as object, createdAt: now } });
}

/** Cập nhật có điều kiện version (CAS) — lệch (ghi đồng thời lọt qua khoá) → 409. */
export async function casUpdate(tx: TenantTx, c: Pick<CampaignRow, 'id' | 'version'>, data: Parameters<TenantTx['campaign']['update']>[0]['data']): Promise<CampaignRow> {
  const r = await tx.campaign.updateMany({ where: { id: c.id, version: c.version }, data: { ...data, version: { increment: 1 } } as never });
  if (!r.count) throw new AppError('STALE_VERSION', 409, { version: String(c.version) });
  return tx.campaign.findUniqueOrThrow({ where: { id: c.id } });
}

/** Tài khoản gửi: đúng loại kênh, còn kết nối. Vắng → tài khoản đang kết nối đầu tiên của kênh (null nếu chưa có). */
export async function senderAccount(tx: TenantTx, type: string, id: string | null | undefined): Promise<{ id: string; name: string; status: string; pausedAt: Date | null } | null> {
  if (id) {
    const a = UUID.test(id) ? await tx.channelAccount.findUnique({ where: { id }, select: { id: true, name: true, status: true, type: true, pausedAt: true } }) : null;
    if (!a || a.type !== type) throw new AppError('VALIDATION_FAILED', 422, { account_id: 'not_found' });
    return a;
  }
  return tx.channelAccount.findFirst({ where: { type, status: 'connected', pausedAt: null }, orderBy: { createdAt: 'asc' }, select: { id: true, name: true, status: true, pausedAt: true } });
}
