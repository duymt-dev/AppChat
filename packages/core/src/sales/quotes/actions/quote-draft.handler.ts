// quote.draft_from_content (D30, templates.md §5): model trích ý định trong `prepare` (ngoài transaction — run AI ghi nhận, trừ credit);
// trong transaction khớp danh mục (giá từ catalog) rồi tạo báo giá NHÁP. Dòng ngoài danh mục / giảm > 5% → báo giá buộc duyệt trước
// khi gửi (offCatalog luôn tính vì do AI soạn). AI chỉ tạo nháp — gửi đi đúng luồng quyền đã chốt.
import { Inject, Injectable, Optional } from '@nestjs/common';
import { TenantContexts } from '@appchat/db';
import type { ActionInput, quoteDraftFromContent } from '@appchat/actions';
import { CLOCK, type Clock } from '../../../kernel/clock';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../../kernel/actions/handler';
import { CrmMembers, actorUserId } from '../../../crm/public';
import { AiRunner } from '../../../ai/runs/runner';
import { trustedParent } from '../../../ai/runs/run-lineage';
import { runOnce } from '../../../ai/agents/agent.runtime';
import { QuoteDeps } from '../services/quote-deps';
import { draftPrompt, intentByRules, matchCatalog, parseIntent, type Intent } from '../services/quote-draft';
import { insertQuote } from './quote-write.handlers';
import { draftPreview } from '../previews/quote-draft.handler.preview';

type In = ActionInput<typeof quoteDraftFromContent>;
type Out = { quote_id: string; code: string; off_catalog: number };

@Injectable()
@ActionHandler('quote.draft_from_content')
export class QuoteDraftFromContentHandler implements Handler<In, Out> {
  constructor(
    @Inject(QuoteDeps) private readonly d: QuoteDeps,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(AiRunner) private readonly runner: AiRunner | null,
  ) {}

  async prepare(ctx: ActionContext, input: In): Promise<Intent> {
    let intent: Intent | null = null;
    if (this.runner && this.d.tenants) {
      const db = await this.d.tenants.get(TenantContexts.system(ctx.workspaceId, 'quote.draft'));
      const p = draftPrompt(input.content);
      const r = await runOnce(db, this.runner, () => this.clock.now(), ctx.workspaceId, {
        run: { kind: 'assistant', title: 'quote.draft_from_content', tier: 'standard', initiatedByUserId: actorUserId(ctx) },
        parent: await trustedParent(db, ctx, 'quote.draft_from_content'),
        system: p.system,
        prompt: p.prompt,
        source: 'assistant',
      });
      intent = r.status === 'completed' ? parseIntent(r.text) : null;
    }
    // Model không ra kết quả dùng được (hết credit, lỗi, model giả) → bộ luật miễn phí; giá vẫn từ catalog.
    return intent ?? intentByRules(input.content);
  }

  async execute(ctx: ActionContext, input: In, tx: TenantTx, _ptx?: unknown, prepared?: unknown): Promise<HandlerOutcome<Out>> {
    const intent = prepared as Intent;
    const m = await matchCatalog(tx, intent.lines.length ? intent : { lines: [{ text: input.content.slice(0, 200), qty: 1 }], discountPct: null });
    const q = await insertQuote(ctx, tx, this.members, { contact_id: input.contact_id, items: m.items, header_discount: m.discount, note: input.content.slice(0, 2000) }, this.clock.now(), { ai: true });
    return { result: { quote_id: q.id, code: q.code, off_catalog: m.offCatalog }, after: { id: q.id } };
  }

  async preview(ctx: ActionContext, input: In, tx: TenantTx) {
    return draftPreview(ctx, tx, input);
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const id = (log.after as { id: string }).id;
    await tx.quote.deleteMany({ where: { id, sentAt: null } });
  }
}
