// contract.appendix_owner_otp · appendix_approve_and_sign (TIP-030b F3 spec 16; COMMERCE §9 C2 — Owner ký trước). Step-up OTP riêng của
// phụ lục (không dùng OTP / chữ ký hợp đồng cha): mã gửi email người ký, băm trên `appendix_signer` bên business gắn version hiện tại, 10
// phút, sai 5 lần khoá. Duyệt & ký: kiểm OTP + version ở `prepare`, render + lưu PDF nội dung (ngoài transaction); `execute` khoá phụ lục,
// kiểm lại version + OTP một lần (CAS) rồi đóng băng digest → `pending_signature`. Tệp đã lưu mà CAS hỏng thì mồ côi (dọn sau), không lộ.
import { Inject, Injectable } from '@nestjs/common';
import { TenantContexts } from '@appchat/db';
import { APPENDIX_FLOW, AppError, SIGN_OTP_MAX_FAILS, assertTransition, interpolate, nextState, serverMessages } from '@appchat/shared';
import type { ActionInput, contractAppendixApproveAndSign, contractAppendixOwnerOtp } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { uuidv7 } from '../../kernel/ids';
import { line, preview, updated } from '../../kernel/actions/preview-kit';
import { CrmMembers, actorUserId } from '../../crm/public';
import { SIGNATURE_PNG } from '../actions/contract-approval.handlers';
import { ContractDeps } from '../services/contract-deps';
import { OTP_TTL_MS, newOtp, otpHash, sameOtp } from '../services/sign-link';
import { lockAppendix, moveAppendix, visibleAppendix } from './access';
import { appendixPdf, storeAppendixPdf } from './artifacts';
import { logAppendixEvent } from './events';

type Db = Awaited<ReturnType<NonNullable<ContractDeps['tenants']>['get']>>;
type St = { appendix_id: string; status: string; version: number };

@Injectable()
@ActionHandler('contract.appendix_owner_otp')
export class ContractAppendixOwnerOtpHandler implements Handler<ActionInput<typeof contractAppendixOwnerOtp>, { appendix_id: string; sent_to: string }> {
  constructor(
    @Inject(ContractDeps) private readonly d: ContractDeps,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contractAppendixOwnerOtp>, tx: TenantTx): Promise<HandlerOutcome<{ appendix_id: string; sent_to: string }>> {
    const me = actorUserId(ctx);
    if (!me || ctx.source !== 'ui') throw new AppError('FORBIDDEN', 403, { actor: 'owner_ui_only' });
    const { a } = await lockAppendix(tx, ctx.authz, input.appendix_id);
    if (!nextState(APPENDIX_FLOW, a.status, 'contract.appendix_approve_and_sign')) throw new AppError('INVALID_TRANSITION', 409, { status: a.status });
    const email = await this.d.userEmail(me);
    if (!email) throw new AppError('INVALID_STATE', 409, { email: 'missing' });
    if (this.d.limiter) await this.d.limiter.hit({ name: 'sign:appendix-owner-otp', limit: 5, windowMs: 15 * 60_000 }, `${ctx.workspaceId}:${me}`);
    const now = this.clock.now();
    const name = (await this.members.names([me])).get(me) ?? '';
    const code = newOtp();
    const s = await tx.appendixSigner.upsert({
      where: { appendixId_party: { appendixId: a.id, party: 'business' } },
      create: { id: uuidv7(now.getTime()), appendixId: a.id, party: 'business', appendixVersion: a.version, userId: me, name, email, otpChannel: 'email', createdAt: now },
      update: { appendixVersion: a.version, userId: me, name, email, otpChannel: 'email', otpFails: 0 },
    });
    await tx.appendixSigner.update({ where: { id: s.id }, data: { otpHash: otpHash(s.id, code), otpExpiresAt: new Date(now.getTime() + OTP_TTL_MS) } });
    await logAppendixEvent(tx, { appendixId: a.id, version: a.version, type: 'otp_sent', party: 'business', signerId: s.id, actorName: name, meta: { channel: 'email' }, at: now });
    const m = serverMessages((await this.d.place(ctx.workspaceId)).locale).sales.contract.appendix;
    const body = interpolate(m.ownerOtpBody, { code: a.code, otp: code, version: a.version });
    const mail = { to: email, tag: 'contract_otp', subject: interpolate(m.ownerOtpSubject, { code: a.code, otp: code }), html: `<p>${body}</p>`, text: body };
    return { result: { appendix_id: a.id, sent_to: email.replace(/^(.{2})[^@]*/, '$1•••') }, afterCommit: () => this.d.sendMail(mail) };
  }

  /** Chỉ người dùng ở UI tự xin mã cho mình — Trợ lý không nhận thẻ xác nhận cho bước step-up. */
  async preview(ctx: ActionContext): Promise<never> {
    throw new AppError('FORBIDDEN', 403, { actor: 'owner_ui_only', source: ctx.source });
  }
}

type SignIn = ActionInput<typeof contractAppendixApproveAndSign>;
interface Prepared {
  fileId: string;
  sha256: string;
  signatureFileId: string;
  version: number;
}

@Injectable()
@ActionHandler('contract.appendix_approve_and_sign')
export class ContractAppendixApproveAndSignHandler implements Handler<SignIn, St> {
  constructor(
    @Inject(ContractDeps) private readonly d: ContractDeps,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async prepare(ctx: ActionContext, input: SignIn): Promise<Prepared> {
    if (!SIGNATURE_PNG.test(input.signature_png)) throw new AppError('VALIDATION_FAILED', 422, { signature_png: 'invalid' });
    const db = await this.d.need('tenants').get(TenantContexts.system(ctx.workspaceId, 'contract.appendix_approve_and_sign'));
    const { a, c } = await db.$transaction((tx) => visibleAppendix(tx, ctx.authz, input.appendix_id));
    assertTransition(APPENDIX_FLOW, a.status, 'contract.appendix_approve_and_sign');
    if (a.version !== input.if_version) throw new AppError('CONFLICT', 409, { version: String(a.version) });
    await this.checkOtp(db, a.id, a.version, input.otp);
    const me = actorUserId(ctx);
    const pdf = await appendixPdf(db, this.d, ctx.workspaceId, a, c);
    const f = await storeAppendixPdf(db, this.d, ctx.workspaceId, a, pdf, me, false);
    const png = Buffer.from(input.signature_png.slice(input.signature_png.indexOf(',') + 1), 'base64');
    const sig = await this.d.need('files').upload(db, ctx.workspaceId, { name: `${a.code.replace(/\//g, '-')}-chu-ky-ben-a.png`, mime: 'image/png', body: png, purpose: 'document', uploadedBy: me });
    return { fileId: f.fileId, sha256: f.sha256, signatureFileId: sig.id, version: a.version };
  }

  /** OTP của phụ lục, đúng version: sai → +1 (ghi ngoài transaction action), hết hạn / quá 5 lần / version cũ → xin mã mới. */
  private async checkOtp(db: Db, appendixId: string, version: number, otp: string) {
    const s = await db.appendixSigner.findUnique({ where: { appendixId_party: { appendixId, party: 'business' } } });
    const now = this.clock.now();
    if (!s?.otpHash || !s.otpExpiresAt || s.otpExpiresAt < now || s.otpFails >= SIGN_OTP_MAX_FAILS || s.appendixVersion !== version) throw new AppError('OTP_INVALID', 422, { otp: 'expired' }, '0');
    if (!sameOtp(s.id, otp, s.otpHash)) {
      const fails = s.otpFails + 1;
      await db.appendixSigner.update({ where: { id: s.id }, data: { otpFails: fails } });
      await logAppendixEvent(db, { appendixId, version, type: 'otp_fail', party: 'business', signerId: s.id, actorName: s.name, at: now });
      throw new AppError('OTP_INVALID', 422, { otp: 'invalid' }, String(Math.max(0, SIGN_OTP_MAX_FAILS - fails)));
    }
  }

  async execute(ctx: ActionContext, input: SignIn, tx: TenantTx, _p?: unknown, prepared?: unknown): Promise<HandlerOutcome<St>> {
    const p = prepared as Prepared;
    const { a } = await lockAppendix(tx, ctx.authz, input.appendix_id);
    const to = assertTransition(APPENDIX_FLOW, a.status, 'contract.appendix_approve_and_sign');
    // Sửa nháp giữa lúc render và lúc ký → không ký bản cũ.
    if (a.version !== p.version) throw new AppError('CONFLICT', 409, { version: String(a.version) });
    const now = this.clock.now();
    const me = actorUserId(ctx);
    const used = await tx.appendixSigner.updateMany({
      where: { appendixId: a.id, party: 'business', appendixVersion: a.version, otpHash: { not: null } },
      data: { otpHash: null, otpExpiresAt: null, otpFails: 0, signatureImageFileId: p.signatureFileId, signedAt: now, userId: me, documentHash: p.sha256 },
    });
    if (!used.count) throw new AppError('OTP_INVALID', 422, { otp: 'expired' }, '0');
    await tx.file.updateMany({ where: { id: { in: [p.fileId, p.signatureFileId] } }, data: { confirmed: true } });
    await moveAppendix(tx, a, to, { approvedBy: me, signedByBusinessAt: now, fileId: p.fileId, fileSha256: p.sha256 }, now);
    const s = await tx.appendixSigner.findUnique({ where: { appendixId_party: { appendixId: a.id, party: 'business' } }, select: { id: true, name: true } });
    await logAppendixEvent(tx, { appendixId: a.id, version: a.version, type: 'approved_signed', party: 'business', signerId: s?.id, actorName: s?.name || (await actorNameOf(this.members, ctx)), docSha256: p.sha256, meta: { otp_channel: 'email' }, at: now });
    return { result: { appendix_id: a.id, status: to, version: a.version } };
  }

  async preview(ctx: ActionContext, input: SignIn, tx: TenantTx) {
    const { a } = await visibleAppendix(tx, ctx.authz, input.appendix_id);
    const to = assertTransition(APPENDIX_FLOW, a.status, 'contract.appendix_approve_and_sign');
    return preview('money', line(a.code, a.title), { changes: updated('appendix', a.id, { status: a.status }, { status: to, signed_by: 'business' }), warnings: ['e_signature:otp_email'] });
  }
}

const actorNameOf = async (members: CrmMembers, ctx: ActionContext) => {
  const me = actorUserId(ctx);
  return me ? ((await members.names([me])).get(me) ?? '') : '';
};
