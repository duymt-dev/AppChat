// Trang ký công khai (COMMERCE §9 C1; Blueprint §4.4 public): không đăng nhập — token một lần (hash → workspace qua DB nền tảng
// `tenant_sign_route`). Mở link → `opened`; xin OTP → gửi qua đúng kênh đã gửi link (Zalo đang chat / email), 10 phút; ký = đồng ý
// + OTP đúng + chữ ký tay → render trang chữ ký + chứng nhận, ghép vào PDF đã đóng băng, SHA-256 tệp cuối, khoá nội dung → `signed`,
// gửi bản đã ký cho hai bên; sai OTP 5 lần khoá link; từ chối → `declined`. Rate limit theo token + IP. Endpoint ngoài executor nên
// tự ghi outbox + đánh dấu workspace bẩn (relay đẩy ngay).
import { TenantContexts, type TenantDb } from '@appchat/db';
import { AppError, CONTRACT_FLOW, SIGN_OTP_MAX_FAILS, assertTransition, interpolate, serverMessages, type SignView } from '@appchat/shared';
import { uuidv7 } from '../../kernel/ids';
import { signedFileUrl } from '../../kernel/files/signed-url';
import { markDirty, writeOutbox, type OutboxEventInput } from '../../kernel/outbox/outbox';
import { applyStageRule, writeTimeline } from '../../crm/public';
import { enqueueOutgoing, type Outgoing } from '../../inbox/public';
import { postToCustomer } from '../../sales/public';
import type { ChannelSendQueue } from '../../channels/public';
import type { ContractDeps } from './contract-deps';
import { storeContractPdf } from './contract-doc';
import { signedContractPdf, type SignParty } from './contract-sign-pdf';
import { maskTarget, readSignToken, sha256Hex } from './sign-link';
import { otpMatches } from '../signing/otp';
import { logSignEvent, moveContract } from './contract-write';
import { SIGNATURE_PNG } from '../actions/contract-approval.handlers';
import { inEventTransaction } from '../../kernel/outbox/transaction';
import type { ActionExecutor } from '../../kernel/actions/executor';
import { requestRef, runPublicSigning } from '../signing/module';

export interface Client {
  ip: string | null;
  userAgent: string | null;
}

const RULES = {
  open: { name: 'sign:open', limit: 60, windowMs: 15 * 60_000 },
  otp: { name: 'sign:otp', limit: 5, windowMs: 15 * 60_000 },
  act: { name: 'sign:act', limit: 20, windowMs: 15 * 60_000 },
};
const SYSTEM = { type: 'system', id: null };
const SENDER = { type: 'system' as const, id: null, name: null };
const invalid = () => new AppError('SIGN_LINK_INVALID', 410, { token: 'invalid' });

export class PublicSignService {
  constructor(
    private readonly d: ContractDeps,
    private readonly queue: ChannelSendQueue | null,
    private readonly now: () => Date,
    private readonly executor: Pick<ActionExecutor, 'execute'> | null = null,
  ) {}

  private exec() {
    if (!this.executor) throw new AppError('NOT_IMPLEMENTED', 501, { sign: 'executor_missing' });
    return this.executor;
  }

  private async limit(rule: keyof typeof RULES, token: string, c: Client) {
    if (!this.d.limiter) return;
    await this.d.limiter.hit(RULES[rule], sha256Hex(token).slice(0, 24));
    if (c.ip) await this.d.limiter.hit({ ...RULES[rule], name: `${RULES[rule].name}:ip`, limit: RULES[rule].limit * 4 }, sha256Hex(c.ip).slice(0, 24));
  }

  /** token → (workspace, db, bản ghi token còn dùng được). */
  private async resolve(token: string) {
    const env = this.d.need('env');
    const tokenId = readSignToken(env.key, token.slice(0, 120));
    if (!tokenId) throw invalid();
    const hash = sha256Hex(token);
    const route = await this.d.need('platform').tenantSignRoute.findUnique({ where: { tokenHash: hash } });
    if (!route) throw invalid();
    const db = await this.d.need('tenants').get(TenantContexts.system(route.workspaceId, 'contract.public_sign'));
    const t = await db.contractSignToken.findUnique({ where: { tokenHash: hash } });
    if (!t || t.id !== tokenId) throw invalid();
    return { ws: route.workspaceId, db, t, hash };
  }

  /** Link còn ký được: chưa bị thay, chưa hết hạn, hợp đồng đang chờ ký, chưa sai OTP quá 5 lần. */
  private async live(db: TenantDb, t: { contractId: string; signerId: string; usedAt: Date | null; expiresAt: Date }) {
    const [c, s] = await Promise.all([db.contract.findUnique({ where: { id: t.contractId } }), db.contractSigner.findUnique({ where: { id: t.signerId } })]);
    if (!c || c.deletedAt || !s) throw invalid();
    if (t.usedAt || t.expiresAt < this.now() || c.status !== 'pending_signature' || s.otpFails >= SIGN_OTP_MAX_FAILS) throw invalid();
    return { c, s };
  }

  private async view(db: TenantDb, ws: string, contractId: string, signerId: string, expiresAt: Date | null): Promise<SignView> {
    const [c, s, events] = await Promise.all([
      db.contract.findUniqueOrThrow({ where: { id: contractId } }),
      db.contractSigner.findUniqueOrThrow({ where: { id: signerId } }),
      db.contractSignatureEvent.findMany({ where: { contractId }, orderBy: { createdAt: 'asc' } }),
    ]);
    const contact = await db.contact.findUnique({ where: { id: c.contactId }, select: { name: true, phone: true } });
    const bp = await this.d.need('platform').businessProfile.findUnique({ where: { workspaceId: ws }, select: { legalName: true } });
    const name = bp?.legalName || (await this.d.place(ws)).name;
    const pub = ['sent', 'opened', 'otp_sent', 'otp_ok', 'signed'];
    const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
    return {
      code: c.code,
      title: c.title,
      kind: c.kind,
      value: String(c.value),
      start_date: iso(c.startDate),
      end_date: iso(c.endDate),
      customer: { name: contact?.name ?? s.name, phone: maskTarget(contact?.phone ?? '') },
      business: { name, signed: !!c.signedByBusinessAt },
      status: c.status,
      expires_at: expiresAt?.toISOString() ?? null,
      signed_at: c.signedByCustomerAt?.toISOString() ?? null,
      sha256: c.signedSha256,
      otp_left: Math.max(0, SIGN_OTP_MAX_FAILS - s.otpFails),
      certificate: c.status === 'signed' ? events.filter((e) => pub.includes(e.type)).map((e) => ({ type: e.type, at: e.createdAt.toISOString(), actor: e.actorName, ...(e.ip ? { ip: e.ip } : {}), ...(e.docSha256 ? { doc_sha256: e.docSha256 } : {}) })) : [],
      pdf: !!(c.signedFileId ?? c.fileId),
    };
  }

  /** GET xem: CHỈ ĐỌC (TIP-030c §1.1) — không ghi opened / không tiêu OTP; link đã thay / hết hạn khi còn chờ ký → 410. */
  async read(token: string, client: Client): Promise<SignView> {
    await this.limit('open', token, client);
    const { ws, db, t } = await this.resolve(token);
    const c = await db.contract.findUnique({ where: { id: t.contractId }, select: { status: true, deletedAt: true } });
    if (!c || c.deletedAt) throw invalid();
    if (c.status === 'pending_signature' && (t.usedAt || t.expiresAt < this.now())) throw invalid();
    return this.view(db, ws, t.contractId, t.signerId, t.expiresAt);
  }

  /** POST open: một lần ghi `opened` mỗi request_id (action `contract.public_open` qua executor). */
  async open(token: string, client: Client, requestId: unknown): Promise<SignView> {
    await this.limit('open', token, client);
    const r = await this.resolve(token);
    const ref = requestRef(r.t.id, 'open', requestId);
    await runPublicSigning(this.exec(), this.d.tenants, r, 'contract.public_open', ref, {}, { client, contractVersion: 0 });
    return this.view(r.db, r.ws, r.t.contractId, r.t.signerId, r.t.expiresAt);
  }

  /** Xin OTP — action `contract.public_otp` (tăng thế hệ + tin vào hội thoại đã gửi link). */
  async otp(token: string, client: Client, requestId: unknown): Promise<{ channel: string; sent_to: string; delivery_status: string }> {
    await this.limit('otp', token, client);
    const r = await this.resolve(token);
    const ref = requestRef(r.t.id, 'otp', requestId);
    const o = await runPublicSigning<{ channel: string; sent_to: string; delivery_status: string }>(this.exec(), this.d.tenants, r, 'contract.public_otp', ref, {}, { client, contractVersion: 0 });
    return { channel: o.channel, sent_to: o.sent_to, delivery_status: o.delivery_status };
  }

  async decline(token: string, client: Client, requestId: unknown, reason?: string): Promise<SignView> {
    await this.limit('act', token, client);
    const r = await this.resolve(token);
    const why = reason?.trim().slice(0, 500);
    const ref = requestRef(r.t.id, 'decline', requestId);
    await runPublicSigning(this.exec(), this.d.tenants, r, 'contract.public_decline', ref, why ? { reason: why } : {}, { client, contractVersion: 0 });
    return this.view(r.db, r.ws, r.t.contractId, r.t.signerId, r.t.expiresAt);
  }

  /** Ký: OTP đúng (một lần) + đồng ý + chữ ký → PDF cuối có chữ ký hai bên + trang chứng nhận, SHA-256, khoá nội dung. */
  async sign(token: string, client: Client, body: { otp?: unknown; signature_png?: unknown; consent?: unknown }): Promise<SignView> {
    await this.limit('act', token, client);
    if (body.consent !== true) throw new AppError('VALIDATION_FAILED', 422, { consent: 'required' });
    const png = typeof body.signature_png === 'string' ? body.signature_png : '';
    if (!SIGNATURE_PNG.test(png)) throw new AppError('VALIDATION_FAILED', 422, { signature_png: 'invalid' });
    const otp = typeof body.otp === 'string' ? body.otp : '';
    const { ws, db, t } = await this.resolve(token);
    const { c, s } = await this.live(db, t);
    const now = this.now();
    if (!s.otpHash || !s.otpExpiresAt || s.otpExpiresAt < now) throw new AppError('OTP_INVALID', 422, { otp: 'expired' }, String(SIGN_OTP_MAX_FAILS - s.otpFails));
    if (!otpMatches(this.d.need('env').key, s, otp)) {
      const fails = s.otpFails + 1;
      await db.contractSigner.update({ where: { id: s.id }, data: { otpFails: fails } });
      await logSignEvent(db, { contractId: c.id, signerId: s.id, type: 'otp_fail', actorName: s.name, ip: client.ip, userAgent: client.userAgent, at: now });
      // Sai lần thứ 5 → link khoá (trang báo hết hiệu lực).
      if (fails >= SIGN_OTP_MAX_FAILS) throw invalid();
      throw new AppError('OTP_INVALID', 422, { otp: 'invalid' }, String(SIGN_OTP_MAX_FAILS - fails));
    }
    const files = this.d.need('files');
    if (!c.fileId || !this.d.renderer) throw new AppError('NOT_IMPLEMENTED', 501, { render: 'render_unavailable' });
    const content = await files.read(db, c.fileId);
    if (!content) throw new AppError('INTERNAL', 500, { file_id: 'missing' });
    const biz = await db.contractSigner.findUnique({ where: { contractId_party: { contractId: c.id, party: 'business' } } });
    const bizSig = biz?.signatureImageFileId ? await files.read(db, biz.signatureImageFileId) : null;
    const events = await db.contractSignatureEvent.findMany({ where: { contractId: c.id }, orderBy: { createdAt: 'asc' } });
    const p = await this.d.place(ws);
    const txId = uuidv7(now.getTime());
    const party = (x: { name: string; signedAt: Date | null; ip: string | null; userAgent: string | null; otpChannel: string | null } | null, label: string, sig: string): SignParty => ({
      label,
      name: x?.name ?? '',
      signaturePng: sig,
      signedAt: x?.signedAt ?? now,
      ip: x?.ip ?? null,
      userAgent: x?.userAgent ?? null,
      otpChannel: x?.otpChannel ?? 'email',
    });
    const cm = serverMessages(p.locale).sales.contract.cert;
    const cert = {
      code: c.code,
      title: c.title,
      contentSha256: c.fileSha256 ?? content.row.sha256,
      txId,
      locale: p.locale,
      timeZone: p.timeZone,
      business: party(biz ? { ...biz, otpChannel: 'email' } : null, cm.business, bizSig ? `data:image/png;base64,${bizSig.body.toString('base64')}` : ''),
      customer: party({ name: s.name, signedAt: now, ip: client.ip, userAgent: client.userAgent, otpChannel: s.otpChannel }, cm.customer, png),
      events: [...events.map((e) => ({ type: e.type, at: e.createdAt, actor: e.actorName, ip: e.ip })), { type: 'otp_ok', at: now, actor: s.name, ip: client.ip }, { type: 'signed', at: now, actor: s.name, ip: client.ip }],
    };
    const finalPdf = await signedContractPdf(this.d.renderer, content.body, cert);
    const stored = await storeContractPdf(db, this.d, ws, c, finalPdf, null, p.locale, true);
    const sigFile = await files.upload(db, ws, { name: `${c.code}-chu-ky-ben-b.png`, mime: 'image/png', body: Buffer.from(png.slice(png.indexOf(',') + 1), 'base64'), purpose: 'document', uploadedBy: null });
    let out: Outgoing | null = null;
    await inEventTransaction(db, ws, async (tx) => {
      // OTP dùng một lần + chống ký trùng hai tab: đổi trạng thái có điều kiện.
      const used = await tx.contractSigner.updateMany({ where: { id: s.id, otpHash: s.otpHash, otpGeneration: s.otpGeneration }, data: { otpHash: null, otpExpiresAt: null, signedAt: now, ip: client.ip, userAgent: client.userAgent, signatureImageFileId: sigFile.id } });
      if (!used.count) throw invalid();
      await tx.file.updateMany({ where: { id: { in: [stored.fileId, sigFile.id] } }, data: { confirmed: true } });
      await moveContract(tx, c, assertTransition(CONTRACT_FLOW, c.status, 'contract.sign'), { signedByCustomerAt: now, signedFileId: stored.fileId, signedSha256: stored.sha256, signedDate: new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`), decidedAt: now }, now);
      await tx.contractSignToken.update({ where: { id: t.id }, data: { usedAt: now } });
      await logSignEvent(tx, { contractId: c.id, signerId: s.id, type: 'otp_ok', actorName: s.name, ip: client.ip, userAgent: client.userAgent, at: now });
      await logSignEvent(tx, { contractId: c.id, signerId: s.id, type: 'signed', actorName: s.name, docSha256: stored.sha256, ip: client.ip, userAgent: client.userAgent, meta: { tx: txId, channel: s.otpChannel }, at: now });
      await writeTimeline(tx, { contactId: c.contactId, type: 'contract', key: 'contract_signed', params: { code: c.code }, actor: SYSTEM, ref: { type: 'contract', id: c.id }, at: now });
      const stage = await applyStageRule(tx, { contactId: c.contactId, mode: 'raise', to: 'contract', actor: SYSTEM, now });
      const events: OutboxEventInput[] = [{ topic: 'contract.signed', payload: { contract_id: c.id, contact_id: c.contactId, code: c.code, signed_sha256: stored.sha256 } }, this.ownerNotice(c, 'contract_signed', s.name), ...stage];
      // Gửi bản đã ký cho khách vào hội thoại đã gửi link (bên DN tải trong app + thông báo kèm email).
      const conv = c.conversationId ? await tx.conversation.findUnique({ where: { id: c.conversationId } }) : null;
      if (conv) {
        const env = this.d.need('env');
        const text = interpolate(serverMessages(p.locale).sales.contract.signedMessage, { code: c.code, sha: stored.sha256.slice(0, 16) });
        const sent = await postToCustomer(this.systemCtx(ws), tx, this.d.members, { conv, created: false, text, file: { url: signedFileUrl(env.apiBase, env.key, ws, stored.fileId), name: stored.name, fileId: stored.fileId }, now, sender: SENDER });
        out = sent.out;
        events.push(...sent.events);
      }
      await writeOutbox(tx, ws, events, now);
    });
    if (out) await enqueueOutgoing(this.queue, ws, out);
    await this.dirty(ws);
    return this.view(db, ws, c.id, s.id, t.expiresAt);
  }

  /** PDF công khai: bản đã ký nếu có, không thì bản nội dung đã đóng băng. */
  async pdf(token: string, client: Client): Promise<{ name: string; pdf: Buffer }> {
    await this.limit('open', token, client);
    const { db, t } = await this.resolve(token);
    const c = await db.contract.findUnique({ where: { id: t.contractId } });
    const id = c?.signedFileId ?? c?.fileId;
    const f = id && !c?.deletedAt ? await this.d.need('files').read(db, id) : null;
    if (!f) throw invalid();
    return { name: f.row.name, pdf: f.body };
  }

  private ownerNotice(c: { id: string; code: string; ownerUserId: string | null }, kind: 'contract_signed' | 'contract_declined', contact: string, reason?: string): OutboxEventInput {
    const fmtReason = reason?.slice(0, 200) ?? '';
    return {
      topic: 'notify.requested',
      payload: { kind, to: c.ownerUserId ? { user_ids: [c.ownerUserId], permission: 'contract.sign' } : { permission: 'contract.sign' }, params: { code: c.code, contact: contact.slice(0, 200), reason: fmtReason }, link: `/contracts?c=${c.id}` },
    };
  }

  private systemCtx(ws: string) {
    return { workspaceId: ws, source: 'system', actor: { type: 'system', id: 'contract.sign' }, authz: { isOwner: true } } as never;
  }

  private async dirty(ws: string) {
    if (this.d.kv) await markDirty(this.d.kv, ws).catch(() => undefined);
  }
}

