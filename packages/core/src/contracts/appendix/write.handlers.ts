// contract.create_appendix · appendix_update · appendix_submit · appendix_request_changes (TIP-030b F3 spec 12–13). Chỉ hợp đồng cha đã ký;
// số PL-n cấp dưới khoá dòng hợp đồng cha (hai yêu cầu đồng thời không trùng số); cùng `request_key` → trả lại phụ lục cũ. Nguồn tệp qua
// guard 2 lớp ở `prepare` (người ra lệnh là người tải). Sửa chỉ khi nháp, CAS `if_version`, version +1 (token / OTP cũ hết hiệu lực).
// Hợp đồng cha (bytes / giá trị / chữ ký) không đổi; `value_delta` chỉ là siêu dữ liệu.
import { Inject, Injectable } from '@nestjs/common';
import { TenantContexts } from '@appchat/db';
import { APPENDIX_FLOW, AppError, assertTransition } from '@appchat/shared';
import type { ActionInput, contractAppendixRequestChanges, contractAppendixSubmit, contractAppendixUpdate, contractCreateAppendix } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { uuidv7 } from '../../kernel/ids';
import { created, line, preview, updated } from '../../kernel/actions/preview-kit';
import { CrmMembers, actorUserId } from '../../crm/public';
import type { GuardedDocument } from '../../documents/public';
import { lockContract, visibleContract } from '../contract-access';
import { ContractDeps } from '../services/contract-deps';
import { actorNameOf } from '../services/contract-write';
import { guardUpload } from '../files/source';
import { lockAppendix, moveAppendix, visibleAppendix } from './access';
import { logAppendixEvent } from './events';

type CreateIn = ActionInput<typeof contractCreateAppendix>;
type St = { appendix_id: string; status: string; version: number };
const big = (v: string | null | undefined) => (v === undefined ? undefined : v === null ? null : BigInt(v));

@Injectable()
@ActionHandler('contract.create_appendix')
export class ContractCreateAppendixHandler implements Handler<CreateIn, { contract_id: string; appendix_id: string; code: string }> {
  constructor(
    @Inject(ContractDeps) private readonly d: ContractDeps,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Nguồn tệp: guard theo người ra lệnh trước mọi ghi (tệp không phải của mình / không an toàn → từ chối). */
  async prepare(ctx: ActionContext, input: CreateIn): Promise<GuardedDocument | null> {
    if (!input.file_id) return null;
    const me = actorUserId(ctx);
    if (!me) throw new AppError('FORBIDDEN', 403, { actor: 'user_required' });
    const db = await this.d.need('tenants').get(TenantContexts.system(ctx.workspaceId, 'contract.create_appendix'));
    return guardUpload(db, this.d.need('files'), me, input.file_id, this.clock.now());
  }

  async execute(ctx: ActionContext, input: CreateIn, tx: TenantTx, _p?: unknown, prepared?: unknown): Promise<HandlerOutcome<{ contract_id: string; appendix_id: string; code: string }>> {
    const c = await lockContract(tx, ctx.authz, input.contract_id);
    const prev = await tx.contractAppendix.findUnique({ where: { contractId_requestKey: { contractId: c.id, requestKey: input.request_key } } });
    if (prev) return { result: { contract_id: c.id, appendix_id: prev.id, code: prev.code } };
    if (c.status !== 'signed') throw new AppError('INVALID_STATE', 409, { contract: c.status });
    const g = prepared as GuardedDocument | null;
    const now = this.clock.now();
    const last = await tx.contractAppendix.aggregate({ where: { contractId: c.id }, _max: { seq: true } });
    const seq = (last._max.seq ?? 0) + 1;
    const id = uuidv7(now.getTime());
    const code = `${c.code}/PL-${seq}`;
    await tx.contractAppendix.create({
      data: {
        id,
        contractId: c.id,
        code,
        seq,
        title: input.title,
        bodyHtml: input.content ?? null,
        valueDelta: big(input.value_delta) ?? null,
        note: input.note ?? '',
        requestKey: input.request_key,
        createdById: actorUserId(ctx),
        ...(g ? { source: 'file' as const, sourceFileId: g.fileId, sourceHash: g.sha256, sourceMime: g.mime } : {}),
        createdAt: now,
        updatedAt: now,
      },
    });
    if (g) await tx.file.updateMany({ where: { id: g.fileId }, data: { confirmed: true } });
    await logAppendixEvent(tx, { appendixId: id, version: 1, type: 'created', actorName: await actorNameOf(ctx, this.members), docSha256: g?.sha256 ?? null, at: now });
    return { result: { contract_id: c.id, appendix_id: id, code }, after: { appendix_id: id, code, contract_id: c.id } };
  }

  async preview(ctx: ActionContext, input: CreateIn, tx: TenantTx) {
    const c = await visibleContract(tx, ctx.authz, input.contract_id, 'write');
    if (c.status !== 'signed') throw new AppError('INVALID_STATE', 409, { contract: c.status });
    return preview('write', line(c.code, input.title), { changes: [created('appendix', { contract: c.code, title: input.title, value_delta: input.value_delta, source: input.file_id ? 'file' : 'content' })] });
  }
}

@Injectable()
@ActionHandler('contract.appendix_update')
export class ContractAppendixUpdateHandler implements Handler<ActionInput<typeof contractAppendixUpdate>, St> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contractAppendixUpdate>, tx: TenantTx): Promise<HandlerOutcome<St>> {
    const { a } = await lockAppendix(tx, ctx.authz, input.appendix_id);
    assertTransition(APPENDIX_FLOW, a.status, 'contract.appendix_update');
    if (a.version !== input.if_version) throw new AppError('CONFLICT', 409, { version: String(a.version) });
    const p = input.patch;
    if (p.content !== undefined && a.source === 'file') throw new AppError('VALIDATION_FAILED', 422, { content: 'file_source' });
    const now = this.clock.now();
    const version = a.version + 1;
    const data = { ...(p.title !== undefined ? { title: p.title } : {}), ...(p.content !== undefined ? { bodyHtml: p.content } : {}), ...(p.value_delta !== undefined ? { valueDelta: big(p.value_delta) } : {}), ...(p.note !== undefined ? { note: p.note } : {}) };
    await moveAppendix(tx, a, 'draft', { ...data, version }, now);
    // Version mới → mọi link / OTP của version cũ hết hiệu lực.
    await tx.appendixSignToken.updateMany({ where: { appendixId: a.id, usedAt: null }, data: { usedAt: now } });
    await tx.appendixSigner.updateMany({ where: { appendixId: a.id }, data: { otpHash: null, otpExpiresAt: null } });
    await logAppendixEvent(tx, { appendixId: a.id, version, type: 'updated', actorName: await actorNameOf(ctx, this.members), at: now });
    return { result: { appendix_id: a.id, status: 'draft', version } };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof contractAppendixUpdate>, tx: TenantTx) {
    const { a } = await visibleAppendix(tx, ctx.authz, input.appendix_id, 'write');
    assertTransition(APPENDIX_FLOW, a.status, 'contract.appendix_update');
    const cur = { title: a.title, content: a.bodyHtml, value_delta: a.valueDelta === null ? null : String(a.valueDelta), note: a.note };
    return preview('write', line(a.code, a.title), { changes: updated('appendix', a.id, cur, input.patch) });
  }
}

/** Trình duyệt / yêu cầu sửa — chuyển trạng thái theo APPENDIX_FLOW + nhật ký phụ lục. */
async function move(ctx: ActionContext, tx: TenantTx, members: CrmMembers, id: string, action: string, event: string, now: Date, reason?: string): Promise<St> {
  const { a } = await lockAppendix(tx, ctx.authz, id);
  const to = assertTransition(APPENDIX_FLOW, a.status, action);
  await moveAppendix(tx, a, to, {}, now);
  await logAppendixEvent(tx, { appendixId: a.id, version: a.version, type: event, actorName: await actorNameOf(ctx, members), meta: reason?.trim() ? { reason: reason.trim() } : {}, at: now });
  return { appendix_id: a.id, status: to, version: a.version };
}

async function movePreview(ctx: ActionContext, tx: TenantTx, id: string, action: string, reason?: string) {
  const { a } = await visibleAppendix(tx, ctx.authz, id, 'write');
  const to = assertTransition(APPENDIX_FLOW, a.status, action);
  return preview('write', line(a.code, a.title), { changes: updated('appendix', a.id, { status: a.status }, { status: to, reason: reason?.trim() || undefined }) });
}

@Injectable()
@ActionHandler('contract.appendix_submit')
export class ContractAppendixSubmitHandler implements Handler<ActionInput<typeof contractAppendixSubmit>, St> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contractAppendixSubmit>, tx: TenantTx): Promise<HandlerOutcome<St>> {
    const r = await move(ctx, tx, this.members, input.appendix_id, 'contract.appendix_submit', 'submitted', this.clock.now());
    const a = await tx.contractAppendix.findUniqueOrThrow({ where: { id: r.appendix_id }, select: { code: true, contractId: true } });
    const me = actorUserId(ctx);
    return {
      result: r,
      events: [{ topic: 'notify.requested', payload: { kind: 'contract_approval', to: { permission: 'contract.sign' }, params: { actor: (await actorNameOf(ctx, this.members)).slice(0, 200), code: a.code, contact: '' }, link: `/contracts?c=${a.contractId}`, ...(me ? { exclude_user_id: me } : {}) } }],
    };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof contractAppendixSubmit>, tx: TenantTx) {
    return movePreview(ctx, tx, input.appendix_id, 'contract.appendix_submit');
  }
}

@Injectable()
@ActionHandler('contract.appendix_request_changes')
export class ContractAppendixRequestChangesHandler implements Handler<ActionInput<typeof contractAppendixRequestChanges>, St> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contractAppendixRequestChanges>, tx: TenantTx): Promise<HandlerOutcome<St>> {
    return { result: await move(ctx, tx, this.members, input.appendix_id, 'contract.appendix_request_changes', 'changes_requested', this.clock.now(), input.reason) };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof contractAppendixRequestChanges>, tx: TenantTx) {
    return movePreview(ctx, tx, input.appendix_id, 'contract.appendix_request_changes', input.reason);
  }
}
