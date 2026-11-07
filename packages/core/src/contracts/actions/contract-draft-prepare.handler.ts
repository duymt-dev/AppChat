// contract.prepare_draft (TIP-030b spec 9–10): bước SOẠN có tính credit, tách khỏi tạo hợp đồng. `prepare` (ngoài transaction): kiểm khách /
// báo giá / tệp theo scope hiện hành TRƯỚC khi gọi model, trùng `request_key` → dùng lại đề xuất cũ (không gọi model lần hai), rồi một lượt
// model qua AiRunner (gateway + meter) KHÔNG tool — model chỉ trả JSON ý định. `execute` khớp catalog (giá catalog, dòng lạ đánh dấu) và lưu
// đề xuất BẤT BIẾN 24h. Model lỗi / hết credit / model giả trả rác → bộ luật miễn phí (vẫn đề xuất được, không bịa giá). Không ghi nghiệp vụ.
import { Inject, Injectable, Optional } from '@nestjs/common';
import { TenantContexts } from '@appchat/db';
import { prompt } from '@appchat/ai';
import { AppError } from '@appchat/shared';
import type { ActionInput, contractPrepareDraft } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import { uuidv7 } from '../../kernel/ids';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { actorUserId, editableContact } from '../../crm/public';
import { visibleQuote } from '../../sales/public';
import { pickContractTemplate } from '../../documents/public';
import { AiRunner } from '../../ai/runs/runner';
import { trustedParent } from '../../ai/runs/run-lineage';
import { runOnce } from '../../ai/agents/agent.runtime';
import { ContractDeps } from '../services/contract-deps';
import { guardUpload } from '../files/source';
import { parseInWorker } from '../files/parse-worker';
import { DRAFT_TTL_MS, draftByRules, draftContent, draftMessages, hashOf, parseDraftIntent, type DraftIntent } from '../files/draft-content';
import { proposalActor } from '../files/suggestions';

type In = ActionInput<typeof contractPrepareDraft>;
type Row = Awaited<ReturnType<TenantTx['contractDraftProposal']['findUnique']>>;
interface Prepared {
  existing: NonNullable<Row> | null;
  intent: DraftIntent;
  sources: Record<string, unknown>;
  run: { id: string | null; model: string | null };
}

const kindOf = (i: In) => i.kind ?? 'service';
const requestHash = (i: In) => hashOf({ contact_id: i.contact_id, quote_id: i.quote_id ?? null, kind: kindOf(i), brief: i.brief, file_id: i.file_id ?? null });

function out(p: NonNullable<Row>) {
  const c = p.content as Record<string, unknown>;
  return { proposal_id: p.id, content_hash: p.contentHash, expires_at: p.expiresAt.toISOString(), ...c, suggestions: p.suggestions, run_id: p.runId, model: p.model } as never;
}

@Injectable()
@ActionHandler('contract.prepare_draft')
export class ContractPrepareDraftHandler implements Handler<In, unknown> {
  constructor(
    @Inject(ContractDeps) private readonly d: ContractDeps,
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(AiRunner) private readonly runner: AiRunner | null,
  ) {}

  async prepare(ctx: ActionContext, input: In): Promise<Prepared> {
    const db = await this.d.need('tenants').get(TenantContexts.system(ctx.workspaceId, 'contract.prepare_draft'));
    const actor = proposalActor(ctx);
    const prev = await db.contractDraftProposal.findUnique({ where: { requestActor_requestKey: { requestActor: actor, requestKey: input.request_key } } });
    if (prev) {
      if (prev.requestHash !== requestHash(input)) throw new AppError('CONFLICT', 409, { request_key: 'mismatch' });
      return { existing: prev, intent: draftByRules(''), sources: {}, run: { id: null, model: null } };
    }
    // Quyền hiện hành trước model: khách sửa được, báo giá thấy được, tệp do chính người gọi tải lên (guard + bytes).
    const { quoteLines, quote } = await db.$transaction(async (tx) => {
      await editableContact(tx, ctx.authz, input.contact_id);
      const q = input.quote_id ? await visibleQuote(tx, ctx.authz, input.quote_id) : null;
      if (q && q.contactId !== input.contact_id) throw new AppError('VALIDATION_FAILED', 422, { quote_id: 'contact_mismatch' });
      const items = q ? await tx.quoteItem.findMany({ where: { quoteId: q.id }, orderBy: { sort: 'asc' }, select: { name: true, qty: true } }) : [];
      return { quote: q, quoteLines: items.map((i) => `${i.name} x${Number(i.qty)}`) };
    });
    let fileText: string | null = null;
    const sources: Record<string, unknown> = {};
    if (input.file_id) {
      const me = actorUserId(ctx);
      if (!me) throw new AppError('FORBIDDEN', 403, { actor: 'user_required' });
      const g = await guardUpload(db, this.d.need('files'), me, input.file_id, this.clock.now());
      const r = await parseInWorker(g.type, g.body, undefined, g.pages);
      fileText = r.ok ? r.text : null;
      sources.file = { id: g.fileId, sha256: g.sha256 };
    }
    if (quote) sources.quote = { id: quote.id, updated_at: quote.updatedAt.toISOString() };
    const tpl = await pickContractTemplate(db, kindOf(input));
    if (tpl) sources.template = { id: tpl.id, version: tpl.version };
    const locale = (await this.d.place(ctx.workspaceId)).locale;
    const p = prompt('contract-draft', locale);
    sources.prompt = { name: p.name, version: p.version };
    let intent: DraftIntent | null = null;
    let run: Prepared['run'] = { id: null, model: null };
    if (this.runner) {
      const r = await runOnce(db, this.runner, () => this.clock.now(), ctx.workspaceId, {
        run: { kind: 'assistant', title: 'contract.prepare_draft', tier: 'standard', initiatedByUserId: actorUserId(ctx) },
        parent: await trustedParent(db, ctx, 'contract.prepare_draft'),
        system: p.text,
        prompt: draftMessages(input.brief, kindOf(input), fileText, quoteLines),
        source: 'assistant',
      });
      if (r.status === 'failed' && r.error?.code === 'CREDIT_EXHAUSTED') throw new AppError('CREDIT_EXHAUSTED', 402, { run_id: r.runId });
      intent = r.status === 'completed' ? parseDraftIntent(r.text) : null;
      const step = await db.aiRunStep.findFirst({ where: { runId: r.runId, type: 'llm' }, select: { model: true } });
      run = { id: r.runId, model: step?.model ?? null };
    }
    // Không có model / model trả không đúng khung → bộ luật (dòng từ brief + báo giá, ngày dd/mm/yyyy). Giá vẫn từ catalog.
    const rules = draftByRules([input.brief, ...quoteLines.map((l) => l.replace(/ x(\d+)$/, ' $1'))].join('\n'));
    return { existing: null, intent: intent && (intent.lines.length || !rules.lines.length) ? intent : { ...rules, suggestions: intent?.suggestions ?? [] }, sources, run };
  }

  async execute(ctx: ActionContext, input: In, tx: TenantTx, _ptx?: unknown, prepared?: unknown): Promise<HandlerOutcome<unknown>> {
    const p = prepared as Prepared;
    if (p.existing) return { result: out(p.existing) };
    const now = this.clock.now();
    const content = await draftContent(tx, p.intent, input.brief.split('\n')[0]!.slice(0, 120));
    const suggestions = p.intent.suggestions.map((text, i) => ({ id: `s${i + 1}`, text }));
    const row = await tx.contractDraftProposal.create({
      data: {
        id: uuidv7(now.getTime()),
        requestActor: proposalActor(ctx),
        requestKey: input.request_key,
        requestHash: requestHash(input),
        contactId: input.contact_id,
        quoteId: input.quote_id ?? null,
        kind: kindOf(input),
        content: content as never,
        suggestions: suggestions as never,
        sources: p.sources as never,
        contentHash: hashOf({ content, suggestions }),
        runId: p.run.id,
        model: p.run.model,
        promptVersion: (p.sources.prompt as { version: number } | undefined)?.version ?? null,
        expiresAt: new Date(now.getTime() + DRAFT_TTL_MS),
        createdAt: now,
      },
    });
    return { result: out(row) };
  }
}
