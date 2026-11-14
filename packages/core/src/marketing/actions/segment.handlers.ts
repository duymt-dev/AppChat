// segment.preview · create · update · delete (TIP-037, REQ-I01): đếm (đã khử trùng) + số gửi được theo cùng service với GET; lưu phân
// khúc là bộ lọc AST đóng (đã validate ở schema action) + số khách lúc lưu. Sửa / xoá kiểm version; không xoá phân khúc mà chiến dịch nháp
// / chờ duyệt còn dùng (409 — chiến dịch đã gửi duyệt giữ snapshot nên không phụ thuộc). Hoàn tác 24 giờ khôi phục bản trước.
import { Inject, Injectable } from '@nestjs/common';
import { AppError, assertVersion, type SegmentNode } from '@appchat/shared';
import type { ActionInput, ActionPreview, segmentCreate, segmentDelete, segmentPreview, segmentUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { created, line, preview, removed, updated } from '../../kernel/actions/preview-kit';
import { uuidv7 } from '../../kernel/ids';
import { actorUserId } from '../../crm/public';
import { countAudience } from '../services/segments.service';

type SegOut = { segment_id: string; count: number; version: number };
type Snap = { id: string; name: string; filter: unknown; last_count: number; version: number; deleted_at: string | null };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function lockSegment(tx: TenantTx, id: string, ifVersion?: number) {
  const rows = UUID.test(id) ? await tx.$queryRaw<{ id: string }[]>`SELECT id FROM segment WHERE id = ${id}::uuid AND deleted_at IS NULL FOR UPDATE` : [];
  const s = rows[0] ? await tx.segment.findUnique({ where: { id } }) : null;
  if (!s) throw new AppError('NOT_FOUND', 404, { segment_id: 'not_found' });
  assertVersion(s.version, ifVersion);
  return s;
}

const snap = (s: { id: string; name: string; filter: unknown; lastCount: number; version: number; deletedAt: Date | null }): Snap => ({
  id: s.id, name: s.name, filter: s.filter, last_count: s.lastCount, version: s.version, deleted_at: s.deletedAt?.toISOString() ?? null,
});

async function restore(tx: TenantTx, log: ActionLogRow, now: Date) {
  const b = log.before as Snap;
  await tx.$queryRaw`SELECT 1 FROM segment WHERE id = ${b.id}::uuid FOR UPDATE`;
  const cur = await tx.segment.findUnique({ where: { id: b.id } });
  const after = log.result as { version?: number } | null;
  if (!cur || (after?.version !== undefined && cur.version !== after.version)) throw new AppError('CONFLICT', 409, { segment_id: 'changed' });
  await tx.segment.update({ where: { id: b.id }, data: { name: b.name, filter: b.filter as object, lastCount: b.last_count, deletedAt: b.deleted_at ? new Date(b.deleted_at) : null, version: { increment: 1 }, updatedAt: now } });
}

@Injectable()
@ActionHandler('segment.preview')
export class SegmentPreviewHandler implements Handler<ActionInput<typeof segmentPreview>, { count: number; reachable: number }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof segmentPreview>, tx: TenantTx): Promise<HandlerOutcome<{ count: number; reachable: number }>> {
    const r = await countAudience(tx, ctx.authz, { segmentIds: input.segment_ids, filter: input.filter as SegmentNode | undefined, contactIds: input.contact_ids }, input.channel ?? null, this.clock.now());
    return { result: r };
  }
}

@Injectable()
@ActionHandler('segment.create')
export class SegmentCreateHandler implements Handler<ActionInput<typeof segmentCreate>, SegOut> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof segmentCreate>, tx: TenantTx): Promise<ActionPreview> {
    const n = await countAudience(tx, ctx.authz, { filter: input.filter as SegmentNode }, null, this.clock.now());
    return preview('write', line(input.name, n.count), { count: n.count, changes: [created('segment', { name: input.name, count: n.count })] });
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof segmentCreate>, tx: TenantTx): Promise<HandlerOutcome<SegOut>> {
    const now = this.clock.now();
    const n = await countAudience(tx, ctx.authz, { filter: input.filter as SegmentNode }, null, now);
    const id = uuidv7(now.getTime());
    await tx.segment.create({ data: { id, name: input.name, filter: input.filter as object, lastCount: n.count, createdByUserId: actorUserId(ctx), createdAt: now, updatedAt: now } });
    return { result: { segment_id: id, count: n.count, version: 1 }, after: { id }, events: [{ topic: 'segment.changed', payload: { segment_id: id, change: 'created' } }] };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    const id = (log.after as { id: string }).id;
    if (await tx.campaign.findFirst({ where: { segmentIds: { has: id }, status: { in: ['draft', 'pending_approval'] }, deletedAt: null }, select: { id: true } })) throw new AppError('CONFLICT', 409, { segment_id: 'in_use' });
    await tx.segment.update({ where: { id }, data: { deletedAt: this.clock.now() } });
  }
}

@Injectable()
@ActionHandler('segment.update')
export class SegmentUpdateHandler implements Handler<ActionInput<typeof segmentUpdate>, SegOut> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(_ctx: ActionContext, input: ActionInput<typeof segmentUpdate>, tx: TenantTx): Promise<ActionPreview> {
    const s = await tx.segment.findFirst({ where: { id: UUID.test(input.segment_id) ? input.segment_id : undefined, deletedAt: null } });
    if (!s) throw new AppError('NOT_FOUND', 404, { segment_id: 'not_found' });
    return preview('write', s.name, { changes: updated('segment', s.id, { name: s.name, filter: s.filter }, { name: input.name, filter: input.filter }) });
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof segmentUpdate>, tx: TenantTx): Promise<HandlerOutcome<SegOut>> {
    const now = this.clock.now();
    const s = await lockSegment(tx, input.segment_id, input.if_version);
    const filter = (input.filter ?? s.filter) as SegmentNode;
    const n = await countAudience(tx, ctx.authz, { filter }, null, now);
    const row = await tx.segment.update({ where: { id: s.id }, data: { name: input.name ?? s.name, filter: filter as object, lastCount: n.count, version: { increment: 1 }, updatedAt: now } });
    return { result: { segment_id: s.id, count: n.count, version: row.version }, before: snap(s), events: [{ topic: 'segment.changed', payload: { segment_id: s.id, change: 'updated' } }] };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    await restore(tx, log, this.clock.now());
  }
}

@Injectable()
@ActionHandler('segment.delete')
export class SegmentDeleteHandler implements Handler<ActionInput<typeof segmentDelete>, { segment_id: string }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(_ctx: ActionContext, input: ActionInput<typeof segmentDelete>, tx: TenantTx): Promise<ActionPreview> {
    const s = await tx.segment.findFirst({ where: { id: UUID.test(input.segment_id) ? input.segment_id : undefined, deletedAt: null } });
    if (!s) throw new AppError('NOT_FOUND', 404, { segment_id: 'not_found' });
    return preview('delete', s.name, { changes: [removed('segment', s.id, { name: s.name, count: s.lastCount })] });
  }

  async execute(_ctx: ActionContext, input: ActionInput<typeof segmentDelete>, tx: TenantTx): Promise<HandlerOutcome<{ segment_id: string }>> {
    const now = this.clock.now();
    const s = await lockSegment(tx, input.segment_id, input.if_version);
    // Nháp / chờ duyệt còn tham chiếu → 409 (chiến dịch đã duyệt giữ snapshot người nhận riêng).
    if (await tx.campaign.findFirst({ where: { segmentIds: { has: s.id }, status: { in: ['draft', 'pending_approval', 'rejected'] }, deletedAt: null }, select: { id: true } }))
      throw new AppError('CONFLICT', 409, { segment_id: 'in_use' });
    const row = await tx.segment.update({ where: { id: s.id }, data: { deletedAt: now, version: { increment: 1 }, updatedAt: now } });
    return { result: { segment_id: s.id }, before: snap(s), after: { version: row.version }, events: [{ topic: 'segment.changed', payload: { segment_id: s.id, change: 'deleted' } }] };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    await restore(tx, { ...log, result: log.after }, this.clock.now());
  }
}
