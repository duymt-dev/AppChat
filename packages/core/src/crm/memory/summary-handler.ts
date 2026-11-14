// contact.summarize (TIP-015b, read · skill): `prepare` (ngoài transaction) kiểm khách thấy được → ảnh chụp theo quyền → fingerprint; cache
// khớp và chưa hết hạn (và không `refresh`) → dùng lại; không thì gọi model MỘT lần qua AiRunner (gateway + meter, không tool). `execute`
// (trong transaction) đọc lại ảnh chụp: fingerprint lệch → không lưu, trả `retry`; khớp → lưu cache. Model lỗi / không có / trả sai khung →
// bộ luật (`source: rule`). Hết credit → 402. Cache theo khoá phạm vi: Owner và CS không bao giờ dùng chung bản tóm tắt.
import { Inject, Injectable, Optional } from '@nestjs/common';
import { prompt } from '@appchat/ai';
import { AppError } from '@appchat/shared';
import type { ActionInput, ActionOutput, ActionPreview, contactSummarize } from '@appchat/actions';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { preview } from '../../kernel/actions/preview-kit';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { AiRunner } from '../../ai/runs/runner';
import { trustedParent } from '../../ai/runs/run-lineage';
import { runOnce } from '../../ai/agents/agent.runtime';
import { actorUserId, visibleContact } from '../services/access';
import { SUMMARY_TTL_MS, fingerprintOf, parseBullets, ruleBullets, scopeKey, snapshotOf, summaryMessage } from './summary';

type In = ActionInput<typeof contactSummarize>;
type Out = ActionOutput<typeof contactSummarize>;
const KIND = 'summary';

interface Prepared {
  contactId: string;
  key: string;
  locale: string;
  timeZone: string;
  fingerprint: string;
  cached: Out | null;
  bullets: string[];
  source: 'model' | 'rule';
  runId: string | null;
}

@Injectable()
@ActionHandler('contact.summarize')
export class ContactSummarizeHandler implements Handler<In, Out> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | undefined,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Optional() @Inject(AiRunner) private readonly runner: AiRunner | null,
  ) {}

  private async place(ctx: ActionContext) {
    const me = actorUserId(ctx);
    const [w, u] = await Promise.all([
      this.platform?.workspace.findUnique({ where: { id: ctx.workspaceId }, select: { timezone: true, locale: true } }),
      me ? this.platform?.user.findUnique({ where: { id: me }, select: { locale: true } }) : null,
    ]);
    return { timeZone: w?.timezone ?? 'Asia/Ho_Chi_Minh', locale: u?.locale ?? w?.locale ?? 'vi' };
  }

  async prepare(ctx: ActionContext, input: In): Promise<Prepared> {
    if (!this.tenants) throw new AppError('NOT_IMPLEMENTED', 501, { tip: '015b' });
    const db = await this.tenants.get(TenantContexts.system(ctx.workspaceId, 'contact.summarize'));
    const pl = await this.place(ctx);
    const now = this.clock.now();
    const key = scopeKey(ctx.authz);
    const doc = prompt('contact-summary', pl.locale);
    const { contactId, snap } = await db.$transaction(async (tx) => {
      const { contact } = await visibleContact(tx, ctx.authz, input.contact_id);
      return { contactId: contact.id, snap: await snapshotOf(tx, ctx.authz, contact.id, { ...pl, now }) };
    });
    const fingerprint = fingerprintOf(snap, key, doc, pl.locale);
    const base = { contactId, key, locale: pl.locale, timeZone: pl.timeZone, fingerprint, runId: null };
    const hit = await db.contactSummaryCache.findUnique({ where: { contactId_kind_scopeKey_locale: { contactId, kind: KIND, scopeKey: key, locale: pl.locale } } });
    if (!input.refresh && hit && hit.fingerprint === fingerprint && hit.expiresAt > now) {
      const body = hit.body as { bullets: string[] };
      return { ...base, cached: { bullets: body.bullets, source: hit.source as Out['source'], status: 'cached', generated_at: hit.createdAt.toISOString() }, bullets: body.bullets, source: hit.source as Out['source'] };
    }
    if (this.runner) {
      const r = await runOnce(db, this.runner, () => this.clock.now(), ctx.workspaceId, {
        run: { kind: 'assistant', title: 'contact.summarize', tier: 'standard', initiatedByUserId: actorUserId(ctx) },
        parent: await trustedParent(db, ctx, 'contact.summarize'),
        system: doc.text,
        prompt: summaryMessage(snap, pl.locale, pl.timeZone),
        source: 'assistant',
      });
      if (r.status === 'failed' && r.error?.code === 'CREDIT_EXHAUSTED') throw new AppError('CREDIT_EXHAUSTED', 402, { run_id: r.runId });
      const bullets = r.status === 'completed' ? parseBullets(r.text) : null;
      if (bullets) return { ...base, runId: r.runId, cached: null, bullets, source: 'model' };
    }
    return { ...base, cached: null, bullets: ruleBullets(snap), source: 'rule' };
  }

  async execute(ctx: ActionContext, _input: In, tx: TenantTx, _ptx?: unknown, prepared?: unknown): Promise<HandlerOutcome<Out>> {
    const p = prepared as Prepared;
    if (p.cached) return { result: p.cached };
    const now = this.clock.now();
    // Đọc lại ảnh chụp dưới transaction: dữ liệu đổi trong lúc model chạy → không publish bản cũ, không lưu cache.
    const again = fingerprintOf(await snapshotOf(tx, ctx.authz, p.contactId, { locale: p.locale, timeZone: p.timeZone, now }), p.key, prompt('contact-summary', p.locale), p.locale);
    if (again !== p.fingerprint) return { result: { bullets: [], source: p.source, status: 'retry', generated_at: now.toISOString() } };
    const rev = await tx.contactRevision.findUnique({ where: { contactId: p.contactId }, select: { dataRev: true } });
    const row = { fingerprint: p.fingerprint, dataRev: rev?.dataRev ?? 0n, body: { bullets: p.bullets }, source: p.source, runId: p.runId, createdAt: now, expiresAt: new Date(now.getTime() + SUMMARY_TTL_MS) };
    await tx.contactSummaryCache.upsert({
      where: { contactId_kind_scopeKey_locale: { contactId: p.contactId, kind: KIND, scopeKey: p.key, locale: p.locale } },
      create: { contactId: p.contactId, kind: KIND, scopeKey: p.key, locale: p.locale, ...row },
      update: row,
    });
    return { result: { bullets: p.bullets, source: p.source, status: 'fresh', generated_at: now.toISOString() } };
  }

  async preview(ctx: ActionContext, input: In, tx: TenantTx): Promise<ActionPreview> {
    const { contact } = await visibleContact(tx, ctx.authz, input.contact_id);
    return preview('read', `${contact.code} · ${contact.name}`, {});
  }
}
