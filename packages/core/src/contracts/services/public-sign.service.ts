// Trang ký công khai (COMMERCE §9 C1; Blueprint §4.4 public): không đăng nhập — token một lần (hash → workspace qua DB nền tảng
// `tenant_sign_route`). Mở link → `opened`; xin OTP → gửi qua đúng kênh đã gửi link (Zalo đang chat / email), 10 phút; ký = đồng ý
// + OTP đúng + chữ ký tay → render trang chữ ký + chứng nhận, ghép vào PDF đã đóng băng, SHA-256 tệp cuối, khoá nội dung → `signed`,
// gửi bản đã ký cho hai bên; sai OTP 5 lần khoá link; từ chối → `declined`. Rate limit theo token + IP. TIP-030c: GET chỉ đọc; mọi ghi
// qua action riêng (capability niêm phong, contracts/signing) — service chỉ phân giải token + dựng SignView.
import { TenantContexts, type TenantDb } from '@appchat/db';
import { AppError, SIGN_OTP_MAX_FAILS, type SignView } from '@appchat/shared';
import { uuidv7 } from '../../kernel/ids';
import type { ChannelSendQueue } from '../../channels/public';
import type { ContractDeps } from './contract-deps';
import { maskTarget, readSignToken, sha256Hex } from './sign-link';
import { SIGNATURE_PNG } from '../actions/contract-approval.handlers';
import type { ActionExecutor } from '../../kernel/actions/executor';
import { requestRef, runPublicSigning } from '../signing/module';
import { signCustomer } from '../signing/render';

export interface Client {
  ip: string | null;
  userAgent: string | null;
}

const RULES = {
  open: { name: 'sign:open', limit: 60, windowMs: 15 * 60_000 },
  otp: { name: 'sign:otp', limit: 5, windowMs: 15 * 60_000 },
  act: { name: 'sign:act', limit: 20, windowMs: 15 * 60_000 },
};
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

  /** Ký (TIP-030c): kiểm OTP ghi bền → render ngoài khoá → đóng băng ứng viên → chốt một transaction; trả SignView sau commit. */
  async sign(token: string, client: Client, body: { otp?: unknown; signature_png?: unknown; consent?: unknown; request_id?: unknown }): Promise<SignView> {
    await this.limit('act', token, client);
    if (body.consent !== true) throw new AppError('VALIDATION_FAILED', 422, { consent: 'required' });
    const png = typeof body.signature_png === 'string' ? body.signature_png : '';
    if (!SIGNATURE_PNG.test(png)) throw new AppError('VALIDATION_FAILED', 422, { signature_png: 'invalid' });
    const otp = typeof body.otp === 'string' ? body.otp : '';
    if (!/^\d{6}$/.test(otp)) throw new AppError('VALIDATION_FAILED', 422, { otp: 'invalid' });
    const r = await this.resolve(token);
    const ref = requestRef(r.t.id, 'sign', body.request_id ?? uuidv7(this.now().getTime()));
    await signCustomer(this.d, this.exec(), this.d.tenants, r, ref, client, otp, png, this.now);
    return this.view(r.db, r.ws, r.t.contractId, r.t.signerId, r.t.expiresAt);
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

}

