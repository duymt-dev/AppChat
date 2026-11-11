// contract.submit · request_changes · reject_internal · approve_and_sign (COMMERCE §9 C2: Owner ký trước — đồng thời là duyệt).
// Trình duyệt thông báo người có `contract.sign` (`contract_approval`). "Duyệt & ký": OTP email của chính Owner (gửi qua
// `POST /v1/contracts/:id/sign-otp`, băm trên `contract_signer` bên business, 10 phút, sai 5 lần khoá) + chữ ký tay → render nội dung
// theo mẫu và đóng băng PDF (`prepare`, ngoài transaction — LibreOffice chậm) → `pending_signature`, event `contract.approved`.
import { Inject, Injectable } from '@nestjs/common';
import { TenantContexts } from '@appchat/db';
import { AppError, CONTRACT_FLOW, SIGN_OTP_MAX_FAILS, assertTransition } from '@appchat/shared';
import type { ActionInput, contractApproveAndSign, contractRejectInternal, contractRequestChanges, contractSubmit } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { CrmMembers, actorUserId } from '../../crm/public';
import { lockContract, visibleContract, type ContractRecord } from '../contract-access';
import { freezeFileSource } from '../files/artifact-store';
import { assertResolved } from '../files/suggestions';
import { ContractDeps } from '../services/contract-deps';
import { renderContractPdf, storeContractPdf } from '../services/contract-doc';
import { otpMatches } from '../signing/otp';
import { actorNameOf, logSignEvent, moveContract } from '../services/contract-write';
import { approveSignPreview, rejectInternalPreview, requestChangesPreview, submitPreview } from './previews/contract-approval.handlers.preview';

type Out = { contract_id: string; status: string };
const cut = (s: string) => s.slice(0, 200);
/** PNG chữ ký tay (khung ký) — giới hạn 300KB. */
export const SIGNATURE_PNG = /^data:image\/png;base64,[A-Za-z0-9+/=]{20,400000}$/;

@Injectable()
@ActionHandler('contract.submit')
export class ContractSubmitHandler implements Handler<ActionInput<typeof contractSubmit>, Out> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contractSubmit>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const c = await lockContract(tx, ctx.authz, input.contract_id);
    const to = assertTransition(CONTRACT_FLOW, c.status, 'contract.submit');
    if (c.value <= 0n) throw new AppError('VALIDATION_FAILED', 422, { value: 'required' });
    // Cổng bắt buộc (TIP-030b spec 11): còn khối gợi ý AI chưa Giữ / Bỏ → không trình duyệt.
    assertResolved(c.aiSuggestions);
    const now = this.clock.now();
    await moveContract(tx, c, to, {}, now);
    const actor = await actorNameOf(ctx, this.members);
    await logSignEvent(tx, { contractId: c.id, type: 'submitted', actorName: actor, at: now });
    const contact = await tx.contact.findUnique({ where: { id: c.contactId }, select: { name: true } });
    const me = actorUserId(ctx);
    return {
      result: { contract_id: c.id, status: to },
      events: [
        {
          topic: 'notify.requested',
          payload: { kind: 'contract_approval', to: { permission: 'contract.sign' }, params: { actor: cut(actor), code: c.code, contact: cut(contact?.name ?? '') }, link: `/contracts?c=${c.id}`, ...(me ? { exclude_user_id: me } : {}) },
        },
      ],
    };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof contractSubmit>, tx: TenantTx) {
    return submitPreview(ctx, tx, input);
  }
}

/** Trả về nháp (yêu cầu sửa / từ chối nội bộ) — lý do ghi vào nhật ký hợp đồng. */
async function backToDraft(ctx: ActionContext, tx: TenantTx, members: CrmMembers, id: string, action: string, event: string, reason: string | undefined, now: Date): Promise<Out> {
  const c = await lockContract(tx, ctx.authz, id);
  const to = assertTransition(CONTRACT_FLOW, c.status, action);
  await moveContract(tx, c, to, {}, now);
  await logSignEvent(tx, { contractId: c.id, type: event, actorName: await actorNameOf(ctx, members), meta: reason?.trim() ? { reason: reason.trim() } : {}, at: now });
  return { contract_id: c.id, status: to };
}

@Injectable()
@ActionHandler('contract.request_changes')
export class ContractRequestChangesHandler implements Handler<ActionInput<typeof contractRequestChanges>, Out> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contractRequestChanges>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    return { result: await backToDraft(ctx, tx, this.members, input.contract_id, 'contract.request_changes', 'changes_requested', input.reason, this.clock.now()) };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof contractRequestChanges>, tx: TenantTx) {
    return requestChangesPreview(ctx, tx, input);
  }
}

@Injectable()
@ActionHandler('contract.reject_internal')
export class ContractRejectInternalHandler implements Handler<ActionInput<typeof contractRejectInternal>, Out> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contractRejectInternal>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    return { result: await backToDraft(ctx, tx, this.members, input.contract_id, 'contract.reject_internal', 'rejected_internal', input.reason, this.clock.now()) };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof contractRejectInternal>, tx: TenantTx) {
    return rejectInternalPreview(ctx, tx, input);
  }
}

type SignIn = ActionInput<typeof contractApproveAndSign>;
interface Prepared {
  fileId: string;
  sha256: string;
  signatureFileId: string;
  templateId: string | null;
  templateVersion: number | null;
  /** Nguồn tệp: version nguồn lúc đóng băng (execute CAS) + bản DOCX đã đổi mới lưu. */
  sourceVersion: number | null;
  rendered: boolean;
  /** Thế hệ OTP đã kiểm (TIP-030c) — chốt chỉ tiêu đúng mã này; mã mới phát trong lúc render → lần thử cũ thất bại. */
  otpGeneration: number;
}

@Injectable()
@ActionHandler('contract.approve_and_sign')
export class ContractApproveAndSignHandler implements Handler<SignIn, Out> {
  constructor(
    @Inject(ContractDeps) private readonly d: ContractDeps,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Kiểm trạng thái + OTP + chữ ký trước khi render (LibreOffice vài giây); render + lưu PDF nội dung + ảnh chữ ký (tệp chưa xác nhận). */
  async prepare(ctx: ActionContext, input: SignIn): Promise<Prepared> {
    if (!SIGNATURE_PNG.test(input.signature_png)) throw new AppError('VALIDATION_FAILED', 422, { signature_png: 'invalid' });
    const db = await this.d.need('tenants').get(TenantContexts.system(ctx.workspaceId, 'contract.approve_and_sign'));
    const c = await db.$transaction((tx) => visibleContract(tx, ctx.authz, input.contract_id, 'write'));
    assertTransition(CONTRACT_FLOW, c.status, 'contract.approve_and_sign');
    const otpGeneration = await this.checkOtp(db, c.id, input.otp);
    const me = actorUserId(ctx);
    const content = c.source === 'file' ? await freezeFileSource(db, this.d, ctx.workspaceId, c, me) : await this.freezeTemplate(db, ctx.workspaceId, c, me);
    const png = Buffer.from(input.signature_png.slice(input.signature_png.indexOf(',') + 1), 'base64');
    const sigFile = await this.d.need('files').upload(db, ctx.workspaceId, { name: `${c.code}-chu-ky-ben-a.png`, mime: 'image/png', body: png, purpose: 'document', uploadedBy: me });
    return { ...content, signatureFileId: sigFile.id, otpGeneration };
  }

  /** Nguồn mẫu: render theo mẫu rồi đóng băng PDF nội dung. */
  private async freezeTemplate(db: Awaited<ReturnType<NonNullable<ContractDeps['tenants']>['get']>>, ws: string, c: ContractRecord, me: string | null) {
    const r = await renderContractPdf(db, this.d, ws, c);
    const f = await storeContractPdf(db, this.d, ws, c, r.pdf, me, r.doc.locale, false);
    return { fileId: f.fileId, sha256: f.sha256, templateId: r.templateId, templateVersion: r.templateVersion, sourceVersion: null, rendered: false };
  }

  /** OTP đúng một lần: sai → +1 lần sai (ghi ngoài transaction action để không bị rollback), quá 5 lần / hết hạn → phải xin mã mới. */
  private async checkOtp(db: Awaited<ReturnType<NonNullable<ContractDeps['tenants']>['get']>>, contractId: string, otp: string) {
    const s = await db.contractSigner.findUnique({ where: { contractId_party: { contractId, party: 'business' } } });
    const now = this.clock.now();
    if (!s?.otpHash || !s.otpExpiresAt || s.otpExpiresAt < now || s.otpFails >= SIGN_OTP_MAX_FAILS) throw new AppError('OTP_INVALID', 422, { otp: 'expired' }, '0');
    if (!otpMatches(this.d.need('env').key, s, otp)) {
      const fails = s.otpFails + 1;
      await db.contractSigner.update({ where: { id: s.id }, data: { otpFails: fails } });
      await logSignEvent(db, { contractId, signerId: s.id, type: 'otp_fail', actorName: s.name, at: now });
      throw new AppError('OTP_INVALID', 422, { otp: 'invalid' }, String(Math.max(0, SIGN_OTP_MAX_FAILS - fails)));
    }
    return s.otpGeneration;
  }

  async execute(ctx: ActionContext, input: SignIn, tx: TenantTx, _ptx?: unknown, prepared?: unknown): Promise<HandlerOutcome<Out>> {
    const p = prepared as Prepared;
    const c = await lockContract(tx, ctx.authz, input.contract_id);
    const to = assertTransition(CONTRACT_FLOW, c.status, 'contract.approve_and_sign');
    const now = this.clock.now();
    const me = actorUserId(ctx);
    // OTP chỉ dùng một lần.
    const used = await tx.contractSigner.updateMany({ where: { contractId: c.id, party: 'business', otpHash: { not: null }, otpGeneration: p.otpGeneration }, data: { otpHash: null, otpExpiresAt: null, otpFails: 0, signatureImageFileId: p.signatureFileId, signedAt: now, userId: me } });
    if (!used.count) throw new AppError('OTP_INVALID', 422, { otp: 'expired' }, '0');
    // Nguồn tệp bị thay giữa lúc đóng băng và lúc ký → không ký bản cũ.
    if (p.sourceVersion !== null && c.sourceVersion !== p.sourceVersion) throw new AppError('CONFLICT', 409, { source_version: 'stale' });
    await tx.file.updateMany({ where: { id: { in: [p.fileId, p.signatureFileId] } }, data: { confirmed: true } });
    const frozen = p.sourceVersion === null ? { templateId: p.templateId, templateVersion: p.templateVersion } : p.rendered ? { renderedUnsignedFileId: p.fileId, renderedUnsignedHash: p.sha256 } : {};
    await moveContract(tx, c, to, { approvedBy: me, signedByBusinessAt: now, fileId: p.fileId, fileSha256: p.sha256, ...frozen }, now);
    const signer = await tx.contractSigner.findUnique({ where: { contractId_party: { contractId: c.id, party: 'business' } }, select: { id: true, name: true } });
    await logSignEvent(tx, { contractId: c.id, signerId: signer?.id, type: 'otp_ok', actorName: signer?.name ?? '', at: now });
    await logSignEvent(tx, { contractId: c.id, signerId: signer?.id, type: 'approved_signed', actorName: signer?.name || (await actorNameOf(ctx, this.members)), docSha256: p.sha256, meta: { otp_channel: 'email' }, at: now });
    return {
      result: { contract_id: c.id, status: to },
      events: [{ topic: 'contract.approved', payload: { contract_id: c.id, contact_id: c.contactId, code: c.code } }],
    };
  }

  async preview(ctx: ActionContext, input: SignIn, tx: TenantTx) {
    return approveSignPreview(ctx, tx, input);
  }
}
