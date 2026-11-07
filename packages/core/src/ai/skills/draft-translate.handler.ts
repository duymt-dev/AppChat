// `ai.translate_draft` (TIP-025b §F.3): dịch bản nháp khi người bấm Gửi ở chế độ tự dịch — chỉ ĐỀ XUẤT xem trước, không gửi. Kiểm
// `inbox.reply` + hội thoại trong scope HIỆN HÀNH trước khi gọi model (không thấy → 404, model không chạy). Model không tool qua cổng
// nháp hạn chế (translation-service). Trả lại `draft_revision` nguyên văn để client bỏ kết quả đã cũ (sửa nháp trong lúc chờ).
import { Inject, Injectable, Optional } from '@nestjs/common';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { AppError, type DraftTranslationDto } from '@appchat/shared';
import type { ActionInput, ActionPreview, aiTranslateDraft } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { line, preview } from '../../kernel/actions/preview-kit';
import { visibleConversation } from '../../inbox/services/access';
import { AiRunner } from '../runs/runner';
import { translateText } from './translation-service';

type In = ActionInput<typeof aiTranslateDraft>;

@Injectable()
@ActionHandler('ai.translate_draft')
export class AiTranslateDraftHandler implements Handler<In, DraftTranslationDto> {
  constructor(
    @Inject(AiRunner) private readonly runner: AiRunner | null,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | null,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: Pick<PlatformDb, 'workspace'> | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async prepare(ctx: ActionContext, input: In): Promise<DraftTranslationDto> {
    if (!this.runner || !this.tenants) throw new AppError('NOT_IMPLEMENTED', 501, { tip: '019' });
    const userId = ctx.actor.type === 'user' ? ctx.actor.id : null;
    if (!userId) throw new AppError('FORBIDDEN', 403, { actor: 'user_only' });
    const db = await this.tenants.get(TenantContexts.system(ctx.workspaceId, 'ai.translate_draft'));
    await db.$transaction((tx) => visibleConversation(tx, ctx.authz, input.conversation_id));
    const epoch = this.platform ? ((await this.platform.workspace.findUnique({ where: { id: ctx.workspaceId }, select: { authzEpoch: true } }))?.authzEpoch ?? 0) : 0;
    const r = await translateText(db, this.runner, () => this.clock.now(), {
      ws: ctx.workspaceId, userId, conversationId: input.conversation_id, text: input.text, to: input.to, authzEpoch: epoch,
      title: 'ai.translate_draft', input: { to: input.to, draft_revision: input.draft_revision, chars: input.text.length },
    });
    return { text: r.text, to: input.to, draft_revision: input.draft_revision, cached: r.cached };
  }

  async execute(_ctx: ActionContext, _input: unknown, _tx: unknown, _ptx: unknown, prepared?: unknown): Promise<HandlerOutcome<DraftTranslationDto>> {
    return { result: prepared as DraftTranslationDto };
  }

  async preview(ctx: ActionContext, input: In, tx: TenantTx): Promise<ActionPreview> {
    await visibleConversation(tx, ctx.authz, input.conversation_id);
    return preview('read', line(input.text.slice(0, 80), input.to), { warnings: ['uses_credit'] });
  }
}
