// `kb.reindex` / `kb.reindex_cancel` (TIP-020e §2.2, DC-288 / DC-302). Xem trước BẮT BUỘC (MANDATORY_PREVIEW_ACTIONS): ước tính số đoạn,
// token, Credit theo đơn giá model đích, dung lượng thêm, cảnh báo nhánh vector tạm dùng khe cũ — dữ kiện (space đích, số đoạn) ràng vào
// confirm token; route đổi giữa xem trước và xác nhận → 409 xem trước lại. Xác nhận → generation `building` ở khe chưa hoạt động (đã có
// generation dở cùng space → trả lại nó; khác space → cũ `superseded`, tạo mới — A→B→C không trộn). Job đẩy SAU commit. Huỷ → `cancelled`,
// dọn khe đích theo lô ở job; khe đang phục vụ giữ nguyên.
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { Embedder } from '@appchat/ai';
import { AppError } from '@appchat/shared';
import type { ActionInput, kbReindex, kbReindexCancel } from '@appchat/actions';
import { CreditMeter } from '../../../billing/services/credit-meter';
import { CLOCK, type Clock } from '../../../kernel/clock';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../../kernel/actions/handler';
import { preview } from '../../../kernel/actions/preview-kit';
import { assertBoundPreview } from '../../../kernel/actions/preview-binding';
import { KB_EMBEDDER } from '../kb-search.handler';
import { estimateReindex, fmtBytes } from './estimate';
import { closeOpen, createGeneration, openGeneration } from './generation.store';
import { currentSpace } from './index-status';
import { KbReindexQueue } from './reindex.queue';
import { otherSlot, readIndexSetting, spaceLabel } from './space';

type Out = { generation_id: string; phase: 'building' | 'catching_up'; expected: number; reused: boolean };

const parts = (space: string) => space.split(':');

@Injectable()
@ActionHandler('kb.reindex')
export class KbReindexHandler implements Handler<ActionInput<typeof kbReindex>, Out> {
  constructor(
    @Inject(KB_EMBEDDER) private readonly embedder: Embedder | null,
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(CreditMeter) private readonly meter: CreditMeter | null = null,
    @Optional() @Inject(KbReindexQueue) private readonly queue: KbReindexQueue | null = null,
  ) {}

  private async target(): Promise<string> {
    const space = await currentSpace(this.embedder);
    if (!space) throw new AppError('VALIDATION_FAILED', 422, { embed: 'no_model_route' }, 'Chưa cấu hình model embedding');
    return space;
  }

  async bindPreview(_ctx: ActionContext, _i: ActionInput<typeof kbReindex>, tx: TenantTx): Promise<Record<string, string | number>> {
    const est = await estimateReindex(tx, null);
    return { space: await this.target(), chunks: est.chunks };
  }

  async preview(_ctx: ActionContext, _i: ActionInput<typeof kbReindex>, tx: TenantTx) {
    const space = await this.target();
    const [provider, model] = parts(space);
    const price = this.meter ? await this.meter.price(provider!, model!).catch(() => null) : null;
    const est = await estimateReindex(tx, price);
    const open = await openGeneration(tx);
    const s = await readIndexSetting(tx);
    return preview('config', `${spaceLabel(space)} · ${est.chunks}`, {
      count: est.chunks,
      changes: [{ entity: 'kb_index', after: { model: spaceLabel(space), chunks: est.chunks, tokens: est.tokens, credits: est.credits, storage: fmtBytes(est.bytes) }, ...(s.activeSpace ? { before: { model: spaceLabel(s.activeSpace) } } : {}) }],
      warnings: [
        'kb_reindex_old_slot_serves',
        ...(est.credits === null ? ['kb_reindex_price_missing'] : []),
        ...(open && open.spaceKey !== space ? ['kb_reindex_supersedes'] : []),
        ...(open && open.spaceKey === space ? ['kb_reindex_in_progress'] : []),
      ],
    });
  }

  async execute(ctx: ActionContext, _i: ActionInput<typeof kbReindex>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const space = await this.target();
    const now = this.clock.now();
    await tx.$queryRaw`SELECT 1 FROM kb_setting WHERE id = 1 FOR UPDATE`;
    const est = await estimateReindex(tx, null);
    assertBoundPreview(ctx.previewFacts, { space, chunks: est.chunks });
    const open = await openGeneration(tx);
    if (open && open.spaceKey === space) {
      return { result: { generation_id: open.id, phase: open.phase === 'catching_up' ? 'catching_up' : 'building', expected: open.expected, reused: true }, noUndo: true };
    }
    if (open) await closeOpen(tx, open.id, 'superseded', 'route_changed', now);
    const s = await readIndexSetting(tx);
    // Cùng space với khe đang phục vụ và không cũ → không có gì để tạo lại.
    if (s.activeSpace === space && s.indexState === 'current' && !open) throw new AppError('CONFLICT', 409, { index: 'current' }, 'Chỉ mục đã dùng model hiện hành');
    const g = await createGeneration(tx, { slot: otherSlot(s.activeSlot), spaceKey: space, expected: est.chunks, createdBy: ctx.actor.type === 'user' ? ctx.actor.id : null, operationId: null, now });
    const queue = this.queue;
    return {
      result: { generation_id: g.id, phase: 'building', expected: g.expected, reused: false },
      after: { generation_id: g.id, slot: g.slot },
      noUndo: true,
      ...(queue ? { afterCommit: () => queue.push(ctx.workspaceId, g.id, null) } : {}),
    };
  }
}

@Injectable()
@ActionHandler('kb.reindex_cancel')
export class KbReindexCancelHandler implements Handler<ActionInput<typeof kbReindexCancel>, { cancelled: boolean; generation_id: string | null }> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(KbReindexQueue) private readonly queue: KbReindexQueue | null = null,
  ) {}

  async preview(_ctx: ActionContext, _i: ActionInput<typeof kbReindexCancel>, tx: TenantTx) {
    const open = await openGeneration(tx);
    return preview('config', open ? `${spaceLabel(open.spaceKey)} · ${open.done}/${open.expected}` : '—', { warnings: open ? [] : ['kb_reindex_nothing_open'] });
  }

  async execute(ctx: ActionContext, _i: ActionInput<typeof kbReindexCancel>, tx: TenantTx): Promise<HandlerOutcome<{ cancelled: boolean; generation_id: string | null }>> {
    const open = await openGeneration(tx);
    if (!open) return { result: { cancelled: false, generation_id: null }, noUndo: true };
    const ok = await closeOpen(tx, open.id, 'cancelled', 'cancelled_by_user', this.clock.now());
    const queue = this.queue;
    // Job dọn khe đích (vector đã ghi của generation bị huỷ) — cùng queue, cùng tiến trình ROLE=ai.
    return { result: { cancelled: ok, generation_id: open.id }, noUndo: true, ...(ok && queue ? { afterCommit: () => queue.push(ctx.workspaceId, open.id, 'purge') } : {}) };
  }
}
