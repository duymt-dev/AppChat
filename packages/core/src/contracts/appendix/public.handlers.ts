// contract.appendix_public_otp · appendix_public_sign · appendix_public_decline (TIP-030b F3 spec 15–16): chỉ chạy với capability niêm phong
// do bộ chuyển token (public.service.ts) gắn vào ctx — /actions (kể cả Owner), Trợ lý, agent đều 403 ở cả preview lẫn execute. Trong
// transaction: khoá phụ lục + token, kiểm lại token (chưa dùng, còn hạn, đúng phụ lục / version / digest / người ký), trạng thái, OTP một
// lần (CAS) — ký trùng / token chéo / token cũ / tài liệu đổi đều thất bại an toàn. Bản cuối = PDF đóng băng + trang chứng nhận của phụ lục,
// lưu tệp mới; tệp mồ côi khi CAS hỏng không bao giờ thành "đã ký". Gửi bản đã ký vào hội thoại qua outbox kênh.
import { Inject, Injectable } from '@nestjs/common';
import { TenantContexts } from '@appchat/db';
import { APPENDIX_FLOW, AppError, SIGN_OTP_MAX_FAILS, assertTransition, interpolate, serverMessages } from '@appchat/shared';
import type { ActionInput, contractAppendixPublicDecline, contractAppendixPublicOtp, contractAppendixPublicSign } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { uuidv7 } from '../../kernel/ids';
import { signedFileUrl } from '../../kernel/files/signed-url';
import { ChannelSendQueue } from '../../channels/public';
import { CrmMembers } from '../../crm/public';
import { enqueueOutgoing, type Outgoing } from '../../inbox/public';
import { postToCustomer } from '../../sales/public';
import { SIGNATURE_PNG } from '../actions/contract-approval.handlers';
import { ContractDeps } from '../services/contract-deps';
import { signedContractPdf, type SignParty } from '../services/contract-sign-pdf';
import { OTP_TTL_MS, newOtp, otpHash, sameOtp } from '../services/sign-link';
import { moveAppendix, type AppendixRecord } from './access';
import { storeAppendixPdf } from './artifacts';
import { requireCapability, type AppendixCapability, type PublicAppendixAction } from './capability';
import { logAppendixEvent } from './events';

const SENDER = { type: 'system' as const, id: null, name: null };
const invalid = () => new AppError('SIGN_LINK_INVALID', 410, { token: 'invalid' });

/** Kiểm lại token + phụ lục + người ký trong transaction (khoá dòng) theo đúng capability. */
async function live(tx: TenantTx, cap: AppendixCapability, now: Date) {
  await tx.$queryRaw`SELECT 1 FROM contract_appendix WHERE id = ${cap.appendixId}::uuid FOR UPDATE`;
  const [t, a, s] = await Promise.all([
    tx.appendixSignToken.findUnique({ where: { id: cap.tokenId } }),
    tx.contractAppendix.findUnique({ where: { id: cap.appendixId } }),
    tx.appendixSigner.findUnique({ where: { id: cap.signerId } }),
  ]);
  if (!t || !a || !s || t.tokenHash !== cap.tokenHash || t.appendixId !== a.id || t.signerId !== s.id || s.appendixId !== a.id || s.party !== 'customer') throw invalid();
  if (t.usedAt || t.expiresAt < now || s.otpFails >= SIGN_OTP_MAX_FAILS) throw invalid();
  // Token gắn version + digest lúc phát: phụ lục đã sửa / đóng băng lại → link cũ hết hiệu lực.
  if (t.appendixVersion !== a.version || t.appendixVersion !== cap.appendixVersion || t.documentHash !== a.fileSha256 || t.documentHash !== cap.documentHash || a.status !== 'pending_signature') throw invalid();
  const c = await tx.contract.findUnique({ where: { id: a.contractId } });
  if (!c || c.deletedAt || c.status !== 'signed') throw invalid();
  return { t, a, s, c };
}

const guard = (ctx: ActionContext, action: PublicAppendixAction, id: string) => requireCapability(ctx, action, id);
const deny = (): never => {
  throw new AppError('FORBIDDEN', 403, { capability: 'missing' });
};

@Injectable()
@ActionHandler('contract.appendix_public_otp')
export class AppendixPublicOtpHandler implements Handler<ActionInput<typeof contractAppendixPublicOtp>, { appendix_id: string; channel: string; sent_to: string }> {
  constructor(
    @Inject(ContractDeps) private readonly d: ContractDeps,
    @Inject(ChannelSendQueue) private readonly queue: ChannelSendQueue | null,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contractAppendixPublicOtp>, tx: TenantTx): Promise<HandlerOutcome<{ appendix_id: string; channel: string; sent_to: string }>> {
    const cap = guard(ctx, 'contract.appendix_public_otp', input.appendix_id);
    const now = this.clock.now();
    const { a, s } = await live(tx, cap, now);
    const conv = a.conversationId ? await tx.conversation.findUnique({ where: { id: a.conversationId } }) : null;
    if (!conv) throw new AppError('INVALID_STATE', 409, { channel: 'no_conversation' });
    const code = newOtp();
    await tx.appendixSigner.update({ where: { id: s.id }, data: { otpHash: otpHash(s.id, code), otpExpiresAt: new Date(now.getTime() + OTP_TTL_MS) } });
    await logAppendixEvent(tx, { appendixId: a.id, version: a.version, type: 'otp_sent', party: 'customer', signerId: s.id, actorName: 'system', ip: cap.client.ip, userAgent: cap.client.userAgent, meta: { channel: s.otpChannel }, at: now });
    const text = interpolate(serverMessages((await this.d.place(ctx.workspaceId)).locale).sales.contract.appendix.otpMessage, { code: a.code, otp: code });
    const sent = await postToCustomer(ctx, tx, this.members, { conv, created: false, text, now, sender: SENDER });
    const target = s.otpChannel === 'email' ? (s.email ?? '') : (s.phone ?? '');
    return { result: { appendix_id: a.id, channel: s.otpChannel ?? 'zalo_personal', sent_to: target }, events: sent.events, afterCommit: () => enqueueOutgoing(this.queue, ctx.workspaceId, sent.out) };
  }

  async preview(): Promise<never> {
    return deny();
  }
}

@Injectable()
@ActionHandler('contract.appendix_public_decline')
export class AppendixPublicDeclineHandler implements Handler<ActionInput<typeof contractAppendixPublicDecline>, { appendix_id: string; status: string }> {
  constructor(
    @Inject(ContractDeps) private readonly d: ContractDeps,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contractAppendixPublicDecline>, tx: TenantTx): Promise<HandlerOutcome<{ appendix_id: string; status: string }>> {
    const cap = guard(ctx, 'contract.appendix_public_decline', input.appendix_id);
    const now = this.clock.now();
    const { t, a, s, c } = await live(tx, cap, now);
    const why = input.reason?.trim().slice(0, 500) || serverMessages((await this.d.place(ctx.workspaceId)).locale).sales.contract.declineDefault;
    const to = assertTransition(APPENDIX_FLOW, a.status, 'contract.appendix_public_decline');
    await moveAppendix(tx, a, to, { declinedReason: why, decidedAt: now }, now);
    await tx.appendixSignToken.update({ where: { id: t.id }, data: { usedAt: now } });
    await logAppendixEvent(tx, { appendixId: a.id, version: a.version, type: 'declined', party: 'customer', signerId: s.id, actorName: s.name, ip: cap.client.ip, userAgent: cap.client.userAgent, meta: { reason: why }, at: now });
    const notice = { topic: 'notify.requested', payload: { kind: 'contract_declined', to: c.ownerUserId ? { user_ids: [c.ownerUserId], permission: 'contract.sign' } : { permission: 'contract.sign' }, params: { code: a.code, contact: s.name.slice(0, 200), reason: why.slice(0, 200) }, link: `/contracts?c=${c.id}` } };
    return { result: { appendix_id: a.id, status: to }, events: [notice] };
  }

  async preview(): Promise<never> {
    return deny();
  }
}

type SignIn = ActionInput<typeof contractAppendixPublicSign>;
interface Prepared {
  fileId: string;
  sha256: string;
  signatureFileId: string;
  name: string;
}

@Injectable()
@ActionHandler('contract.appendix_public_sign')
export class AppendixPublicSignHandler implements Handler<SignIn, { appendix_id: string; status: string; signed_sha256: string }> {
  constructor(
    @Inject(ContractDeps) private readonly d: ContractDeps,
    @Inject(ChannelSendQueue) private readonly queue: ChannelSendQueue | null,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Kiểm OTP (sai → +1 ngoài transaction), dựng PDF cuối từ bản đóng băng (digest phải khớp) + trang chứng nhận, lưu tệp chưa xác nhận. */
  async prepare(ctx: ActionContext, input: SignIn): Promise<Prepared> {
    const cap = guard(ctx, 'contract.appendix_public_sign', input.appendix_id);
    if (!SIGNATURE_PNG.test(input.signature_png)) throw new AppError('VALIDATION_FAILED', 422, { signature_png: 'invalid' });
    const db = await this.d.need('tenants').get(TenantContexts.system(ctx.workspaceId, 'contract.appendix_public_sign'));
    const now = this.clock.now();
    const { a, s, c } = await db.$transaction((tx) => live(tx, cap, now));
    if (!s.otpHash || !s.otpExpiresAt || s.otpExpiresAt < now) throw new AppError('OTP_INVALID', 422, { otp: 'expired' }, String(SIGN_OTP_MAX_FAILS - s.otpFails));
    if (!sameOtp(s.id, input.otp, s.otpHash)) {
      const fails = s.otpFails + 1;
      await db.appendixSigner.update({ where: { id: s.id }, data: { otpFails: fails } });
      await logAppendixEvent(db, { appendixId: a.id, version: a.version, type: 'otp_fail', party: 'customer', signerId: s.id, actorName: s.name, ip: cap.client.ip, userAgent: cap.client.userAgent, at: now });
      if (fails >= SIGN_OTP_MAX_FAILS) throw invalid();
      throw new AppError('OTP_INVALID', 422, { otp: 'invalid' }, String(SIGN_OTP_MAX_FAILS - fails));
    }
    const files = this.d.need('files');
    if (!a.fileId || !this.d.renderer) throw new AppError('NOT_IMPLEMENTED', 501, { render: 'render_unavailable' });
    const content = await files.read(db, a.fileId);
    if (!content || content.row.sha256 !== a.fileSha256) throw new AppError('INVALID_STATE', 409, { appendix: 'hash_mismatch' });
    const pdf = await signedContractPdf(this.d.renderer, content.body, await this.cert(db, ctx.workspaceId, a, c.code, input.signature_png, s, cap, now));
    const stored = await storeAppendixPdf(db, this.d, ctx.workspaceId, a, pdf, null, true);
    const sig = await files.upload(db, ctx.workspaceId, { name: `${a.code.replace(/\//g, '-')}-chu-ky-ben-b.png`, mime: 'image/png', body: Buffer.from(input.signature_png.slice(input.signature_png.indexOf(',') + 1), 'base64'), purpose: 'document', uploadedBy: null });
    return { fileId: stored.fileId, sha256: stored.sha256, signatureFileId: sig.id, name: stored.name };
  }

  private async cert(db: Parameters<typeof logAppendixEvent>[0] & Pick<TenantTx, 'appendixSigner' | 'file'>, ws: string, a: AppendixRecord, contractCode: string, png: string, s: { name: string; otpChannel: string | null }, cap: AppendixCapability, now: Date) {
    const files = this.d.need('files');
    const biz = await db.appendixSigner.findUnique({ where: { appendixId_party: { appendixId: a.id, party: 'business' } } });
    const bizSig = biz?.signatureImageFileId ? await files.read(db, biz.signatureImageFileId) : null;
    const events = await (db as unknown as TenantTx).appendixSignatureEvent.findMany({ where: { appendixId: a.id, appendixVersion: a.version }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
    const p = await this.d.place(ws);
    const cm = serverMessages(p.locale).sales.contract.cert;
    const party = (x: { name: string; signedAt: Date | null; ip: string | null; userAgent: string | null }, label: string, sig: string, otpChannel: string): SignParty => ({ label, name: x.name, signaturePng: sig, signedAt: x.signedAt ?? now, ip: x.ip, userAgent: x.userAgent, otpChannel });
    return {
      code: a.code,
      title: `${a.title} (${contractCode})`,
      contentSha256: a.fileSha256!,
      txId: uuidv7(now.getTime()),
      locale: p.locale,
      timeZone: p.timeZone,
      business: party({ name: biz?.name ?? '', signedAt: biz?.signedAt ?? null, ip: biz?.ip ?? null, userAgent: biz?.userAgent ?? null }, cm.business, bizSig ? `data:image/png;base64,${bizSig.body.toString('base64')}` : '', 'email'),
      customer: party({ name: s.name, signedAt: now, ip: cap.client.ip, userAgent: cap.client.userAgent }, cm.customer, png, s.otpChannel ?? 'zalo_personal'),
      events: [...events.map((e) => ({ type: e.type, at: e.createdAt, actor: e.actorName, ip: e.ip })), { type: 'otp_ok', at: now, actor: s.name, ip: cap.client.ip }, { type: 'signed', at: now, actor: s.name, ip: cap.client.ip }],
    };
  }

  async execute(ctx: ActionContext, input: SignIn, tx: TenantTx, _p?: unknown, prepared?: unknown): Promise<HandlerOutcome<{ appendix_id: string; status: string; signed_sha256: string }>> {
    const cap = guard(ctx, 'contract.appendix_public_sign', input.appendix_id);
    const p = prepared as Prepared;
    const now = this.clock.now();
    const { t, a, s, c } = await live(tx, cap, now);
    // OTP dùng một lần + chống ký trùng hai tab: đổi có điều kiện trên đúng mã băm đã kiểm.
    const used = await tx.appendixSigner.updateMany({ where: { id: s.id, otpHash: s.otpHash, appendixVersion: a.version, signedAt: null }, data: { otpHash: null, otpExpiresAt: null, signedAt: now, ip: cap.client.ip, userAgent: cap.client.userAgent, signatureImageFileId: p.signatureFileId, documentHash: a.fileSha256 } });
    if (!used.count) throw invalid();
    const to = assertTransition(APPENDIX_FLOW, a.status, 'contract.appendix_public_sign');
    await tx.file.updateMany({ where: { id: { in: [p.fileId, p.signatureFileId] } }, data: { confirmed: true } });
    await moveAppendix(tx, a, to, { signedByCustomerAt: now, signedFileId: p.fileId, signedSha256: p.sha256, decidedAt: now }, now);
    await tx.appendixSignToken.update({ where: { id: t.id }, data: { usedAt: now } });
    await logAppendixEvent(tx, { appendixId: a.id, version: a.version, type: 'otp_ok', party: 'customer', signerId: s.id, actorName: s.name, ip: cap.client.ip, userAgent: cap.client.userAgent, at: now });
    await logAppendixEvent(tx, { appendixId: a.id, version: a.version, type: 'signed', party: 'customer', signerId: s.id, actorName: s.name, docSha256: p.sha256, ip: cap.client.ip, userAgent: cap.client.userAgent, meta: { channel: s.otpChannel }, at: now });
    const events: { topic: string; payload: Record<string, unknown> }[] = [
      { topic: 'notify.requested', payload: { kind: 'contract_signed', to: c.ownerUserId ? { user_ids: [c.ownerUserId], permission: 'contract.sign' } : { permission: 'contract.sign' }, params: { code: a.code, contact: s.name.slice(0, 200), reason: '' }, link: `/contracts?c=${c.id}` } },
    ];
    let out: Outgoing | null = null;
    const conv = a.conversationId ? await tx.conversation.findUnique({ where: { id: a.conversationId } }) : null;
    if (conv) {
      const env = this.d.need('env');
      const text = interpolate(serverMessages((await this.d.place(ctx.workspaceId)).locale).sales.contract.appendix.signedMessage, { code: a.code, sha: p.sha256.slice(0, 16) });
      const sent = await postToCustomer(ctx, tx, this.members, { conv, created: false, text, file: { url: signedFileUrl(env.apiBase, env.key, ctx.workspaceId, p.fileId), name: p.name }, now, sender: SENDER });
      out = sent.out;
      events.push(...sent.events);
    }
    return { result: { appendix_id: a.id, status: to, signed_sha256: p.sha256 }, events, ...(out ? { afterCommit: () => enqueueOutgoing(this.queue, ctx.workspaceId, out!) } : {}) };
  }

  async preview(): Promise<never> {
    return deny();
  }
}
