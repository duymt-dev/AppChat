// Handler 4 action đầu vào Trợ lý (TIP-023f §1.2-1.4, §5.3). prepare: tệp kiểm qua guard kernel (chủ = người gọi, purpose attachment,
// chưa hết hạn) — tên / digest / kích thước lấy từ hàng `file` server, KHÔNG từ client; tạo artifact idempotent rồi phát sự kiện đánh
// thức (việc parse chạy ở ROLE=ai, không trong transaction này). remove: chỉ bản nháp chưa buộc, đúng revision. get / read: chủ sở hữu.
import { Inject, Injectable } from '@nestjs/common';
import type { ActionInput, ActionPreview, assistantAttachmentGet, assistantAttachmentPrepare, assistantAttachmentRead, assistantAttachmentRemove } from '@appchat/actions';
import { AppError, INPUT_MAX_ATTACHMENTS, INPUT_PARSER_VERSION, type InputArtifactDto, type InputReadDto } from '@appchat/shared';
import { CLOCK, type Clock } from '../../../kernel/clock';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../../kernel/actions/handler';
import { checkFile, type FileDenied } from '../../../kernel/files/file-access';
import { line, preview } from '../../../kernel/actions/preview-kit';
import { ownSession } from '../sessions';
import { ATTACHMENT_RULE } from '../genui/attachments';
import { ownArtifact, upsertArtifact } from './artifact-store';
import { getArtifact, readParts } from './read';

type Mut = { artifact_id: string; revision: number; phase: InputArtifactDto['phase'] };
const userOf = (ctx: ActionContext) => ctx.onBehalfOfUserId ?? ctx.actor.id;
/** Loại tệp quyết định ở bước parse (theo nội dung) — guard ở đây chỉ kiểm chủ / purpose / hạn / kích thước. */
const SOURCE_RULE = { ...ATTACHMENT_RULE, mimes: undefined };

function denied(reason: FileDenied): never {
  // Tệp người khác / hết hạn → 404 như không có (không lộ tồn tại).
  if (reason === 'too_large') throw new AppError('VALIDATION_FAILED', 413, { file_id: reason });
  if (reason === 'purpose' || reason === 'mime') throw new AppError('VALIDATION_FAILED', 422, { file_id: reason });
  throw new AppError('NOT_FOUND', 404, { file_id: 'not_found' });
}

@Injectable()
@ActionHandler('assistant.attachment_prepare')
export class AttachmentPrepareHandler implements Handler<ActionInput<typeof assistantAttachmentPrepare>, Mut> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, i: ActionInput<typeof assistantAttachmentPrepare>, tx: TenantTx): Promise<HandlerOutcome<Mut>> {
    const userId = userOf(ctx);
    const now = this.clock.now();
    if (i.session_id) await ownSession(tx, userId, i.session_id);
    const f = await checkFile(tx, userId, i.file_id, SOURCE_RULE, now);
    if ('denied' in f) denied(f.denied);
    const digest = (await tx.file.findUnique({ where: { id: f.id }, select: { sha256: true } }))?.sha256 || f.id;
    const live = await tx.assistantInputArtifact.count({ where: { ownerUserId: userId, draftNonce: i.draft_nonce, phase: { not: 'cancelled' } } });
    const { row, created } = await upsertArtifact(tx, { ownerUserId: userId, draftNonce: i.draft_nonce, sessionId: i.session_id ?? null, fileId: f.id, fileDigest: digest, parserVersion: INPUT_PARSER_VERSION, name: f.name, size: f.size, now });
    if (created && live >= INPUT_MAX_ATTACHMENTS) throw new AppError('VALIDATION_FAILED', 422, { attachments: 'too_many' });
    return {
      result: { artifact_id: row.id, revision: row.revision, phase: row.phase },
      noUndo: true,
      ...(created ? { events: [{ topic: 'assistant.input_prepare_requested', payload: { artifact_id: row.id, revision: row.revision } }] } : {}),
    };
  }

  async preview(ctx: ActionContext, i: ActionInput<typeof assistantAttachmentPrepare>, tx: TenantTx): Promise<ActionPreview> {
    const f = await checkFile(tx, userOf(ctx), i.file_id, SOURCE_RULE, this.clock.now());
    if ('denied' in f) denied(f.denied);
    return preview('write', line(f.name, `${Math.ceil(f.size / 1024)} KB`), { count: 1, changes: [{ entity: 'assistant_input_artifact', after: { name: f.name } }] });
  }
}

@Injectable()
@ActionHandler('assistant.attachment_remove')
export class AttachmentRemoveHandler implements Handler<ActionInput<typeof assistantAttachmentRemove>, Mut> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, i: ActionInput<typeof assistantAttachmentRemove>, tx: TenantTx): Promise<HandlerOutcome<Mut>> {
    const a = await ownArtifact(tx, userOf(ctx), i.artifact_id);
    if (a.boundAt) throw new AppError('INVALID_STATE', 409, { artifact: 'already_sent' });
    if (a.revision !== i.if_revision) throw new AppError('CONFLICT', 409, { revision: 'stale' });
    const n = await tx.assistantInputArtifact.updateMany({
      where: { id: a.id, revision: a.revision, boundAt: null },
      data: { phase: 'cancelled', revision: { increment: 1 }, leaseOwner: null, leaseUntil: null, updatedAt: this.clock.now() },
    });
    if (!n.count) throw new AppError('CONFLICT', 409, { revision: 'stale' });
    await tx.assistantInputPart.deleteMany({ where: { artifactId: a.id } });
    return { result: { artifact_id: a.id, revision: a.revision + 1, phase: 'cancelled' }, noUndo: true };
  }

  async preview(ctx: ActionContext, i: ActionInput<typeof assistantAttachmentRemove>, tx: TenantTx): Promise<ActionPreview> {
    const a = await ownArtifact(tx, userOf(ctx), i.artifact_id);
    return preview('write', line(a.name), { count: 1, changes: [{ entity: 'assistant_input_artifact', id: a.id, before: { phase: a.phase }, after: { phase: 'cancelled' } }] });
  }
}

@Injectable()
@ActionHandler('assistant.attachment_get')
export class AttachmentGetHandler implements Handler<ActionInput<typeof assistantAttachmentGet>, InputArtifactDto> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, i: ActionInput<typeof assistantAttachmentGet>, tx: TenantTx): Promise<HandlerOutcome<InputArtifactDto>> {
    return { result: await getArtifact(tx, userOf(ctx), i.artifact_id, this.clock.now()) };
  }
}

@Injectable()
@ActionHandler('assistant.attachment_read')
export class AttachmentReadHandler implements Handler<ActionInput<typeof assistantAttachmentRead>, InputReadDto> {
  async execute(ctx: ActionContext, i: ActionInput<typeof assistantAttachmentRead>, tx: TenantTx): Promise<HandlerOutcome<InputReadDto>> {
    return { result: await readParts(tx, userOf(ctx), i) };
  }
}
