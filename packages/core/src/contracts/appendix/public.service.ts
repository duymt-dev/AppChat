// Trang ký công khai phụ lục (TIP-030b F3 spec 15): không đăng nhập — token phụ lục (miền HMAC riêng) → hash → workspace qua
// `tenant_sign_route`. GET xem / PDF chỉ đọc (mở link ghi `opened`). OTP / ký / từ chối: dựng ActionContext nội bộ MỚI (source system),
// niêm phong capability (phụ lục + version + digest + người ký + action + idempotency key) rồi gọi ActionExecutor — mọi ghi / audit /
// outbox qua executor. Controller không truyền được actor / workspace / phụ lục; capability xoá sau mỗi lần gọi. Rate limit theo token + IP.
import { TenantContexts, type TenantDb } from '@appchat/db';
import { AppError, SIGN_OTP_MAX_FAILS, type AppendixSignView } from '@appchat/shared';
import type { ActionContext } from '../../kernel/actions/action-context';
import type { ActionExecutor } from '../../kernel/actions/executor';
import { uuidv7 } from '../../kernel/ids';
import type { ContractDeps } from '../services/contract-deps';
import { maskTarget, sha256Hex } from '../services/sign-link';
import { seal, unseal, type PublicAppendixAction } from './capability';
import { logAppendixEvent } from './events';
import { readAppendixToken } from './tokens';

export interface Client {
  ip: string | null;
  userAgent: string | null;
}

const RULES = {
  open: { name: 'appendix-sign:open', limit: 60, windowMs: 15 * 60_000 },
  otp: { name: 'appendix-sign:otp', limit: 5, windowMs: 15 * 60_000 },
  act: { name: 'appendix-sign:act', limit: 20, windowMs: 15 * 60_000 },
};
const PUB = ['sent', 'opened', 'otp_sent', 'otp_ok', 'signed', 'approved_signed'];
const invalid = () => new AppError('SIGN_LINK_INVALID', 410, { token: 'invalid' });
const iso = (d: Date | null | undefined) => d?.toISOString() ?? null;

export class AppendixPublicService {
  constructor(
    private readonly d: ContractDeps,
    private readonly executor: Pick<ActionExecutor, 'execute'>,
    private readonly now: () => Date,
  ) {}

  private async limit(rule: keyof typeof RULES, token: string, c: Client) {
    if (!this.d.limiter) return;
    await this.d.limiter.hit(RULES[rule], sha256Hex(token).slice(0, 24));
    if (c.ip) await this.d.limiter.hit({ ...RULES[rule], name: `${RULES[rule].name}:ip`, limit: RULES[rule].limit * 4 }, sha256Hex(c.ip).slice(0, 24));
  }

  /** token → (workspace, db, token phụ lục). Token hợp đồng cha / giả / sai khoá → 410. */
  private async resolve(token: string) {
    const tokenId = readAppendixToken(this.d.need('env').key, token.slice(0, 120));
    if (!tokenId) throw invalid();
    const hash = sha256Hex(token);
    const route = await this.d.need('platform').tenantSignRoute.findUnique({ where: { tokenHash: hash } });
    if (!route) throw invalid();
    const db = await this.d.need('tenants').get(TenantContexts.system(route.workspaceId, 'contract.appendix_public'));
    const t = await db.appendixSignToken.findUnique({ where: { tokenHash: hash } });
    if (!t || t.id !== tokenId) throw invalid();
    return { ws: route.workspaceId, db, t, hash };
  }

  private async view(db: TenantDb, ws: string, appendixId: string, signerId: string, expiresAt: Date): Promise<AppendixSignView> {
    const a = await db.contractAppendix.findUniqueOrThrow({ where: { id: appendixId } });
    const [c, s, events] = await Promise.all([
      db.contract.findUniqueOrThrow({ where: { id: a.contractId } }),
      db.appendixSigner.findUniqueOrThrow({ where: { id: signerId } }),
      db.appendixSignatureEvent.findMany({ where: { appendixId, appendixVersion: a.version }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
    ]);
    const contact = await db.contact.findUnique({ where: { id: c.contactId }, select: { name: true, phone: true } });
    const bp = await this.d.need('platform').businessProfile.findUnique({ where: { workspaceId: ws }, select: { legalName: true } });
    return {
      code: a.code,
      title: a.title,
      contract: { code: c.code, title: c.title },
      content: a.source === 'template' ? a.bodyHtml : null,
      value_delta: a.valueDelta === null ? null : String(a.valueDelta),
      version: a.version,
      customer: { name: contact?.name ?? s.name, phone: maskTarget(contact?.phone ?? '') },
      business: { name: bp?.legalName || (await this.d.place(ws)).name, signed: !!a.signedByBusinessAt },
      status: a.status,
      expires_at: iso(expiresAt),
      signed_at: iso(a.signedByCustomerAt),
      sha256: a.signedSha256,
      otp_left: Math.max(0, SIGN_OTP_MAX_FAILS - s.otpFails),
      certificate: a.status === 'signed' ? events.filter((e) => PUB.includes(e.type)).map((e) => ({ type: e.type, at: e.createdAt.toISOString(), actor: e.actorName, ...(e.ip ? { ip: e.ip } : {}), ...(e.docSha256 ? { doc_sha256: e.docSha256 } : {}) })) : [],
      pdf: !!(a.signedFileId ?? a.fileId),
    };
  }

  /** Link còn dùng được cho đúng version / digest hiện tại của phụ lục. */
  private usable(t: { usedAt: Date | null; expiresAt: Date; appendixVersion: number; documentHash: string }, a: { status: string; version: number; fileSha256: string | null }) {
    return !t.usedAt && t.expiresAt >= this.now() && a.status === 'pending_signature' && t.appendixVersion === a.version && t.documentHash === a.fileSha256;
  }

  async open(token: string, client: Client, record = true): Promise<AppendixSignView> {
    await this.limit('open', token, client);
    const { ws, db, t } = await this.resolve(token);
    const a = await db.contractAppendix.findUnique({ where: { id: t.appendixId } });
    if (!a) throw invalid();
    const ok = this.usable(t, a);
    if (a.status === 'pending_signature' && !ok) throw invalid();
    if (ok && record) {
      const s = await db.appendixSigner.findUnique({ where: { id: t.signerId }, select: { name: true } });
      await logAppendixEvent(db, { appendixId: a.id, version: a.version, type: 'opened', party: 'customer', signerId: t.signerId, actorName: s?.name ?? '', ip: client.ip, userAgent: client.userAgent, at: this.now() });
    }
    return this.view(db, ws, a.id, t.signerId, t.expiresAt);
  }

  /** Dispatch một action công khai qua executor với ctx nội bộ mới + capability niêm phong. */
  private async run<O>(action: PublicAppendixAction, token: string, client: Client, input: Record<string, unknown>, fresh = false): Promise<{ ws: string; db: TenantDb; t: { appendixId: string; signerId: string; expiresAt: Date }; out: O }> {
    const { ws, db, t, hash } = await this.resolve(token);
    const a = await db.contractAppendix.findUnique({ where: { id: t.appendixId } });
    if (!a || !this.usable(t, a)) throw invalid();
    const ctx: ActionContext = {
      workspaceId: ws,
      source: 'system',
      actor: { type: 'system', id: 'appendix.public_sign' },
      // Không mượn quyền người dùng nào: action `self` + capability; ghi đều kiểm lại token trong transaction.
      authz: { userId: '', isOwner: false, permissions: new Set(), scope: {} as never, teamIds: [] },
      // Ký / từ chối: cùng nội dung gửi lại → cùng kết quả (không hai chữ ký). Xin OTP: mỗi lần một yêu cầu mới.
      idempotencyKey: `appendix:${t.id}:${action}:${fresh ? uuidv7(this.now().getTime()) : sha256Hex(JSON.stringify(input)).slice(0, 16)}`,
    };
    seal(ctx, { action, tokenId: t.id, tokenHash: hash, appendixId: a.id, appendixVersion: t.appendixVersion, documentHash: t.documentHash, signerId: t.signerId, idempotencyKey: ctx.idempotencyKey!, client });
    try {
      const r = await this.executor.execute<O>(ctx, action, { appendix_id: a.id, ...input });
      return { ws, db, t, out: (r.data as { result: O }).result };
    } finally {
      unseal(ctx);
    }
  }

  async otp(token: string, client: Client): Promise<{ channel: string; sent_to: string }> {
    await this.limit('otp', token, client);
    const r = await this.run<{ channel: string; sent_to: string }>('contract.appendix_public_otp', token, client, {}, true);
    return { channel: r.out.channel, sent_to: maskTarget(r.out.sent_to) };
  }

  async sign(token: string, client: Client, body: { otp?: unknown; signature_png?: unknown; consent?: unknown }): Promise<AppendixSignView> {
    await this.limit('act', token, client);
    if (body.consent !== true) throw new AppError('VALIDATION_FAILED', 422, { consent: 'required' });
    const r = await this.run('contract.appendix_public_sign', token, client, { otp: typeof body.otp === 'string' ? body.otp : '', signature_png: typeof body.signature_png === 'string' ? body.signature_png : '', consent: true });
    return this.view(r.db, r.ws, r.t.appendixId, r.t.signerId, r.t.expiresAt);
  }

  async decline(token: string, client: Client, reason?: string): Promise<AppendixSignView> {
    await this.limit('act', token, client);
    const r = await this.run('contract.appendix_public_decline', token, client, reason?.trim() ? { reason: reason.trim().slice(0, 500) } : {});
    return this.view(r.db, r.ws, r.t.appendixId, r.t.signerId, r.t.expiresAt);
  }

  /** PDF công khai: bản đã ký nếu có, không thì bản đóng băng của đúng phụ lục. */
  async pdf(token: string, client: Client): Promise<{ name: string; pdf: Buffer }> {
    await this.limit('open', token, client);
    const { db, t } = await this.resolve(token);
    const a = await db.contractAppendix.findUnique({ where: { id: t.appendixId } });
    const id = a?.signedFileId ?? a?.fileId;
    const f = id ? await this.d.need('files').read(db, id) : null;
    if (!f) throw invalid();
    return { name: f.row.name, pdf: f.body };
  }
}
