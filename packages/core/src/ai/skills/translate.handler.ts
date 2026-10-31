// Skill `ai.translate` (TIP-025, REQ-C05 menu ⋯ tin "Dịch"): dịch một tin của hội thoại sang ngôn ngữ người dùng (hoặc `to`) bằng
// model — run `consult` tier standard, credit trừ như mọi run (Blueprint §5). Gọi model trong `prepare` (ngoài transaction). Đọc tin
// theo scope inbox của người gọi (không thấy hội thoại → 404). Model giả trả câu có tiền tố ngôn ngữ ("[EN] …").
import { Inject, Injectable, Optional } from '@nestjs/common';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { ActionInput, aiTranslate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import type { ActionContext } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { visibleConversation } from '../../inbox/services/access';
import { AiRunner } from '../runs/runner';
import { runOnce } from '../agents/agent.runtime';

const LANG: Record<'vi' | 'en', string> = { vi: 'Vietnamese (tiếng Việt)', en: 'English' };

export const TRANSLATE_SYSTEM = (to: 'vi' | 'en') =>
  `# TRANSLATE\nTranslate the user message into ${LANG[to]}. Keep names, numbers, prices, emoji and line breaks. Reply with the translation only — no quotes, no notes.\nTarget: ${to}`;

@Injectable()
@ActionHandler('ai.translate')
export class AiTranslateHandler implements Handler<ActionInput<typeof aiTranslate>, { text: string; to: string }> {
  constructor(
    @Inject(AiRunner) private readonly runner: AiRunner | null,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | null,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: Pick<PlatformDb, 'user'> | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async prepare(ctx: ActionContext, input: ActionInput<typeof aiTranslate>): Promise<{ text: string; to: 'vi' | 'en' }> {
    if (!this.runner || !this.tenants) throw new AppError('NOT_IMPLEMENTED', 501, { tip: '019' });
    const userId = ctx.onBehalfOfUserId ?? (ctx.actor.type === 'user' ? ctx.actor.id : null);
    const db = await this.tenants.get(TenantContexts.system(ctx.workspaceId, 'ai.translate'));
    const body = await db.$transaction(async (tx) => {
      const c = await visibleConversation(tx, ctx.authz, input.conversation_id);
      const m = await tx.message.findUnique({ where: { id: /^[0-9a-f-]{36}$/i.test(input.message_id) ? input.message_id : '00000000-0000-0000-0000-000000000000' } });
      if (!m || m.conversationId !== c.id || m.deletedAt || m.recalledAt) throw new AppError('NOT_FOUND', 404, { message_id: 'not_found' });
      return m.body;
    });
    if (!body.trim()) throw new AppError('VALIDATION_FAILED', 422, { message_id: 'empty' });
    const u = userId && this.platform ? await this.platform.user.findUnique({ where: { id: userId }, select: { locale: true } }) : null;
    const to = input.to ?? (u?.locale === 'en' ? 'en' : 'vi');
    const r = await runOnce(db, this.runner, () => this.clock.now(), ctx.workspaceId, {
      run: { kind: 'consult', title: 'ai.translate', tier: 'standard', initiatedByUserId: userId, conversationId: input.conversation_id, input: { message_id: input.message_id, to } },
      system: TRANSLATE_SYSTEM(to),
      prompt: body.slice(0, 4000),
      source: 'inbox',
    });
    if (r.status === 'failed') {
      const credit = r.error?.code === 'CREDIT_EXHAUSTED';
      throw new AppError(credit ? 'CREDIT_EXHAUSTED' : 'INTERNAL', credit ? 402 : 502, { run_id: r.runId }, r.error?.message);
    }
    return { text: r.text.trim(), to };
  }

  async execute(_ctx: ActionContext, _input: unknown, _tx: unknown, _ptx: unknown, prepared?: unknown): Promise<HandlerOutcome<{ text: string; to: string }>> {
    return { result: prepared as { text: string; to: string } };
  }
}
