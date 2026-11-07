// Skill `ai.translate` (TIP-025, REQ-C05 menu ⋯ tin "Dịch"): dịch một tin của hội thoại sang ngôn ngữ người dùng (hoặc `to`) bằng
// model — run `consult` tier standard, credit trừ như mọi run (Blueprint §5). Gọi model trong `prepare` (ngoài transaction). Đọc tin
// theo scope inbox của người gọi (không thấy hội thoại → 404). Model giả trả câu có tiền tố ngôn ngữ ("[EN] …"). TIP-025b §F: đích
// vi/en/zh/ko/ja, cache theo người + epoch quyền (tự dịch tin vào dùng lại, mount lặp không trừ credit hai lần).
import { Inject, Injectable, Optional } from '@nestjs/common';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { AppError, type TranslateTarget } from '@appchat/shared';
import type { ActionInput, ActionPreview, aiTranslate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { visibleConversation } from '../../inbox/services/access';
import { AiRunner } from '../runs/runner';
import { translateText } from './translation-service';
import { translatePreview } from './previews/translate.handler.preview';

export { TRANSLATE_SYSTEM } from './translation-service';

@Injectable()
@ActionHandler('ai.translate')
export class AiTranslateHandler implements Handler<ActionInput<typeof aiTranslate>, { text: string; to: string }> {
  constructor(
    @Inject(AiRunner) private readonly runner: AiRunner | null,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | null,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: Pick<PlatformDb, 'user' | 'workspace'> | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async prepare(ctx: ActionContext, input: ActionInput<typeof aiTranslate>): Promise<{ text: string; to: TranslateTarget }> {
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
    const epoch = this.platform ? ((await this.platform.workspace.findUnique({ where: { id: ctx.workspaceId }, select: { authzEpoch: true } }))?.authzEpoch ?? 0) : 0;
    const r = await translateText(db, this.runner, () => this.clock.now(), {
      ws: ctx.workspaceId, userId, conversationId: input.conversation_id, text: body.slice(0, 4000), to, authzEpoch: epoch,
      title: 'ai.translate', input: { message_id: input.message_id, to },
    });
    return { text: r.text, to };
  }

  async execute(_ctx: ActionContext, _input: unknown, _tx: unknown, _ptx: unknown, prepared?: unknown): Promise<HandlerOutcome<{ text: string; to: string }>> {
    return { result: prepared as { text: string; to: string } };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof aiTranslate>, tx: TenantTx): Promise<ActionPreview> {
    return translatePreview(ctx, input, tx);
  }
}
